-- RPC: reverse_siteplan_delay
--
-- Undoes the date cascade that was applied when a delay log with
-- impacts_completion=true was created.  It reads the persisted
-- affected_task_ids and delay_days from the log row and subtracts
-- delay_days from those tasks' start_date / end_date, and also
-- reverses the primary task's end_date shift.
--
-- Must be called BEFORE the log row is deleted so that the stored
-- affected_task_ids are still available.
--
-- Parameters:
--   p_log_id  uuid  – the siteplan_delay_logs.id to reverse

CREATE OR REPLACE FUNCTION public.reverse_siteplan_delay(
  p_log_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id             uuid;
  v_delay_days          int;
  v_impacts_completion  bool;
  v_affected_ids        uuid[];
BEGIN
  SELECT task_id, delay_days, impacts_completion, affected_task_ids
    INTO v_task_id, v_delay_days, v_impacts_completion, v_affected_ids
    FROM public.siteplan_delay_logs
   WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delay log not found: %', p_log_id;
  END IF;

  -- Nothing to reverse if the log did not impact the schedule
  IF NOT v_impacts_completion THEN
    RETURN;
  END IF;

  -- Reverse the primary task's end_date shift
  UPDATE public.siteplan_tasks
     SET end_date = end_date - v_delay_days
   WHERE id = v_task_id;

  -- Reverse the cascade on all previously-affected successor tasks
  IF array_length(v_affected_ids, 1) > 0 THEN
    UPDATE public.siteplan_tasks
       SET start_date = start_date - v_delay_days,
           end_date   = end_date   - v_delay_days
     WHERE id = ANY(v_affected_ids);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_siteplan_delay(uuid)
  TO authenticated;
