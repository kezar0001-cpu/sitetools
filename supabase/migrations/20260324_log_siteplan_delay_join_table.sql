-- Update log_siteplan_delay to resolve successor tasks via the new
-- siteplan_task_predecessors join table instead of the legacy text column.
--
-- Signature and return shape are unchanged:
--   Returns jsonb { log_id: uuid, affected_task_ids: uuid[] }

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

  -- Fetch project_id for scoping the successor walk
  SELECT project_id
    INTO v_project_id
    FROM public.siteplan_tasks
   WHERE id = p_task_id;

  -- 3. Shift the primary task's end_date and mark as delayed
  UPDATE public.siteplan_tasks
     SET end_date = end_date + p_delay_days,
         status   = 'delayed'
   WHERE id = p_task_id;

  -- 4. Cascade to all successor tasks via the join table using a recursive CTE,
  --    collecting their IDs for storage and the response.
  WITH RECURSIVE successors AS (
    -- Seed: direct successors of the delayed task (tasks that have p_task_id as predecessor)
    SELECT stp.task_id AS id
      FROM public.siteplan_task_predecessors stp
      JOIN public.siteplan_tasks t ON t.id = stp.task_id
     WHERE stp.predecessor_id = p_task_id
       AND t.project_id = v_project_id

    UNION

    -- Recurse: successors of successors
    SELECT stp.task_id AS id
      FROM public.siteplan_task_predecessors stp
      JOIN public.siteplan_tasks t ON t.id = stp.task_id
      JOIN successors s ON stp.predecessor_id = s.id
     WHERE t.project_id = v_project_id
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
    'log_id',            v_log_id,
    'affected_task_ids', COALESCE(to_jsonb(v_affected_ids), '[]'::jsonb)
  );
END;
$$;

-- Grant execute to authenticated users (RLS on the underlying tables still applies)
GRANT EXECUTE ON FUNCTION public.log_siteplan_delay(uuid, int, text, text, bool, uuid)
  TO authenticated;
