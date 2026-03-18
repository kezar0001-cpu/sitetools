-- RPC: log_siteplan_delay
-- Atomically inserts a delay log and (if impacts_completion = true)
-- shifts the task's end_date and all successor tasks using a recursive CTE.
--
-- Parameters:
--   p_task_id           uuid   - the task being delayed
--   p_delay_days        int    - number of calendar days to add
--   p_reason            text   - human-readable reason
--   p_category          text   - one of the DelayCategory values
--   p_impacts_completion bool  - whether to cascade date shifts
--   p_logged_by         uuid   - auth.users.id of the caller
--
-- Returns: uuid of the newly created delay log record

CREATE OR REPLACE FUNCTION public.log_siteplan_delay(
  p_task_id           uuid,
  p_delay_days        int,
  p_reason            text,
  p_category          text,
  p_impacts_completion bool,
  p_logged_by         uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id    uuid;
  v_wbs_code  text;
  v_project_id uuid;
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

  -- 2. If not impacting completion, we are done
  IF NOT p_impacts_completion THEN
    RETURN v_log_id;
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

  -- 4. Cascade to all successor tasks (tasks that list this task's wbs_code
  --    in their predecessors field) using a recursive CTE.
  --    We collect all affected task ids first, then batch-update them.
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
  )
  UPDATE public.siteplan_tasks t
     SET start_date = t.start_date + p_delay_days,
         end_date   = t.end_date   + p_delay_days
    FROM successors s
   WHERE t.id = s.id;

  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users (RLS on the underlying tables still applies)
GRANT EXECUTE ON FUNCTION public.log_siteplan_delay(uuid, int, text, text, bool, uuid)
  TO authenticated;
