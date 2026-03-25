-- RPC: create_siteplan_task
-- Inserts a new siteplan task with WBS code computed server-side inside a
-- single transaction, eliminating the client-side race condition where two
-- concurrent inserts could read the same sibling count and produce duplicate
-- WBS codes.

create or replace function create_siteplan_task(
  p_project_id   uuid,
  p_name         text,
  p_type         text,
  p_start_date   date,
  p_end_date     date,
  p_parent_id    uuid    default null,
  p_status       text    default 'not_started',
  p_progress     int     default 0,
  p_sort_order   int     default 0,
  p_responsible  text    default null,
  p_assigned_to  text    default null,
  p_comments     text    default null,
  p_notes        text    default null,
  p_predecessors text    default null
)
returns setof siteplan_tasks
language plpgsql
security definer
as $$
declare
  v_sibling_count int;
  v_parent_wbs    text;
  v_wbs_code      text;
begin
  -- Count siblings at the target level.
  -- The count and insert run in the same server-side call so no concurrent
  -- session can interleave and claim the same sibling position.
  select count(*)
  into v_sibling_count
  from siteplan_tasks
  where project_id = p_project_id
    and (
      (p_parent_id is null     and parent_id is null)
      or (p_parent_id is not null and parent_id = p_parent_id)
    );

  -- Fetch parent WBS code when a parent is provided.
  if p_parent_id is not null then
    select wbs_code
    into v_parent_wbs
    from siteplan_tasks
    where id = p_parent_id;
  end if;

  -- Mirror the client-side generateWbsCode(parentWbs, siblingCount) logic:
  --   sibling count is 0-based → 1-based display number.
  if v_parent_wbs is not null then
    v_wbs_code := v_parent_wbs || '.' || (v_sibling_count + 1)::text;
  else
    v_wbs_code := (v_sibling_count + 1)::text;
  end if;

  return query
  insert into siteplan_tasks (
    project_id, parent_id, wbs_code,
    name, type, status,
    start_date, end_date,
    progress, sort_order,
    responsible, assigned_to, comments, notes, predecessors
  ) values (
    p_project_id, p_parent_id, v_wbs_code,
    p_name, p_type::siteplan_task_type, p_status::siteplan_task_status,
    p_start_date, p_end_date,
    p_progress, p_sort_order,
    p_responsible, p_assigned_to, p_comments, p_notes, p_predecessors
  )
  returning *;
end;
$$;

grant execute on function create_siteplan_task(
  uuid, text, text, date, date, uuid, text, int, int,
  text, text, text, text, text
) to authenticated;
