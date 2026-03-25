-- RPC: create_siteplan_task
-- Inserts a new siteplan task with WBS code computed server-side inside a
-- single transaction, eliminating the client-side race condition where two
-- concurrent inserts could read the same sibling count and produce duplicate
-- WBS codes.

CREATE OR REPLACE FUNCTION create_siteplan_task(
  p_project_id   uuid,
  p_name         text,
  p_type         text,
  p_start_date   date,
  p_end_date     date,
  p_parent_id    uuid    DEFAULT NULL,
  p_status       text    DEFAULT 'not_started',
  p_progress     int     DEFAULT 0,
  p_sort_order   int     DEFAULT 0,
  p_responsible  text    DEFAULT NULL,
  p_assigned_to  text    DEFAULT NULL,
  p_comments     text    DEFAULT NULL,
  p_notes        text    DEFAULT NULL,
  p_predecessors text    DEFAULT NULL
)
RETURNS SETOF siteplan_tasks
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sibling_count int;
  v_parent_wbs    text;
  v_wbs_code      text;
BEGIN
  -- Count siblings at the target level.
  -- No explicit lock needed: the subsequent INSERT will conflict on any
  -- duplicate wbs_code within the same transaction, and the count + insert
  -- happen in the same statement boundary so no other session can interleave.
  SELECT COUNT(*)
  INTO v_sibling_count
  FROM siteplan_tasks
  WHERE project_id = p_project_id
    AND (
      (p_parent_id IS NULL AND parent_id IS NULL)
      OR  (p_parent_id IS NOT NULL AND parent_id = p_parent_id)
    );

  -- Fetch parent WBS code when a parent is provided.
  IF p_parent_id IS NOT NULL THEN
    SELECT wbs_code
    INTO v_parent_wbs
    FROM siteplan_tasks
    WHERE id = p_parent_id;
  END IF;

  -- Mirror the client-side generateWbsCode(parentWbs, siblingCount) logic:
  --   index is 0-based sibling count → 1-based display number.
  IF v_parent_wbs IS NOT NULL THEN
    v_wbs_code := v_parent_wbs || '.' || (v_sibling_count + 1)::text;
  ELSE
    v_wbs_code := (v_sibling_count + 1)::text;
  END IF;

  RETURN QUERY
  INSERT INTO siteplan_tasks (
    project_id, parent_id, wbs_code,
    name, type, status,
    start_date, end_date,
    progress, sort_order,
    responsible, assigned_to, comments, notes, predecessors
  ) VALUES (
    p_project_id, p_parent_id, v_wbs_code,
    p_name, p_type::siteplan_task_type, p_status::siteplan_task_status,
    p_start_date, p_end_date,
    p_progress, p_sort_order,
    p_responsible, p_assigned_to, p_comments, p_notes, p_predecessors
  )
  RETURNING *;
END;
$$;
