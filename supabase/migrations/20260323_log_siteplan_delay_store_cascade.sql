-- Update log_siteplan_delay to persist the affected_task_ids on the log row
-- so that the reversal RPC can undo the cascade without re-traversing the graph.
--
-- Returns: jsonb { log_id: uuid, affected_task_ids: uuid[] }  (unchanged)

CREATE OR REPLACE FUNCTION public.log_siteplan_delay(
  p_task_id           uuid,
  p_delay_days        int,
  p_reason            text,
  p_category          text,
  p_impacts_completion bool,
  p_logged_by         uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id         uuid;
  v_wbs_code       text;
  v_project_id     uuid;
  v_affected_ids   uuid[] := '{}';
BEGIN
  -- 1. Insert the delay log record
  INSERT INTO public.siteplan_delay_logs (
    task_id,
    delay_days,
    delay_reason,
    delay_category,
    impacts_completion,
    logged_by
  ) VALUES (
    p_task_id,
    p_delay_days,
    p_reason,
    p_category,
    p_impacts_completion,
    p_logged_by
  )
  RETURNING id INTO v_log_id;

  -- 2. If not impacting completion, return early with empty affected list
  IF NOT p_impacts_completion THEN
    RETURN jsonb_build_object('log_id', v_log_id, 'affected_task_ids', '[]'::jsonb);
  END IF;

  -- Fetch wbs_code and project_id for successor look-up
  SELECT wbs_code, project_id
    INTO v_wbs_code, v_project_id
    FROM public.siteplan_tasks
   WHERE id = p_task_id;

  -- 3. Shift the primary task's end_date and mark as delayed
  UPDATE public.siteplan_tasks
     SET end_date = end_date + p_delay_days,
         status   = 'delayed'
   WHERE id = p_task_id;

  -- 4. Cascade to all successor tasks using a recursive CTE,
  --    collecting their IDs for storage and the response.
  WITH RECURSIVE successors AS (
    -- Seed: direct successors of the delayed task
    SELECT t.id, t.wbs_code
      FROM public.siteplan_tasks t
     WHERE t.project_id = v_project_id
       AND t.predecessors IS NOT NULL
       AND (
             t.predecessors = v_wbs_code
          OR t.predecessors LIKE v_wbs_code || ',%'
          OR t.predecessors LIKE '%,' || v_wbs_code
          OR t.predecessors LIKE '%,' || v_wbs_code || ',%'
          OR t.predecessors LIKE v_wbs_code || 'FS%'
          OR t.predecessors LIKE '%,' || v_wbs_code || 'FS%'
       )

    UNION

    -- Recurse: successors of successors
    SELECT t.id, t.wbs_code
      FROM public.siteplan_tasks t
      JOIN successors s ON (
             t.project_id = v_project_id
         AND t.predecessors IS NOT NULL
         AND (
               t.predecessors = s.wbs_code
            OR t.predecessors LIKE s.wbs_code || ',%'
            OR t.predecessors LIKE '%,' || s.wbs_code
            OR t.predecessors LIKE '%,' || s.wbs_code || ',%'
            OR t.predecessors LIKE s.wbs_code || 'FS%'
            OR t.predecessors LIKE '%,' || s.wbs_code || 'FS%'
         )
      )
  ),
  updated AS (
    UPDATE public.siteplan_tasks t
       SET start_date = t.start_date + p_delay_days,
           end_date   = t.end_date   + p_delay_days
      FROM successors s
     WHERE t.id = s.id
    RETURNING t.id
  )
  SELECT array_agg(id) INTO v_affected_ids FROM updated;

  -- 5. Persist the affected task IDs on the log row for later reversal
  UPDATE public.siteplan_delay_logs
     SET affected_task_ids = COALESCE(v_affected_ids, '{}')
   WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'log_id',           v_log_id,
    'affected_task_ids', COALESCE(to_jsonb(v_affected_ids), '[]'::jsonb)
  );
END;
$$;

-- Grant execute to authenticated users (RLS on the underlying tables still applies)
GRANT EXECUTE ON FUNCTION public.log_siteplan_delay(uuid, int, text, text, bool, uuid)
  TO authenticated;
