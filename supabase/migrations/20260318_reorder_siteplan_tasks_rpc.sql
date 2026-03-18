-- Atomic task reorder RPC
-- Accepts a JSONB array of {id, sort_order, parent_id} objects and
-- applies them all in a single transaction to prevent partial-failure
-- sort-order corruption.

create or replace function reorder_siteplan_tasks(updates jsonb)
returns void
language plpgsql
security definer
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(updates)
  loop
    update siteplan_tasks
    set
      sort_order = (item->>'sort_order')::int,
      parent_id = case
        when item->>'parent_id' = '' or item->>'parent_id' is null then null
        else (item->>'parent_id')::uuid
      end,
      updated_at = now()
    where id = (item->>'id')::uuid;
  end loop;
end;
$$;

-- Grant execute to authenticated users (RLS on the table still applies for reads)
grant execute on function reorder_siteplan_tasks(jsonb) to authenticated;
