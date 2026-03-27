-- =============================================================
-- Allow authenticated company members to delete ITP items
-- =============================================================

create policy itp_items_delete on public.itp_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.itp_sessions s
      where s.id = itp_items.session_id
        and s.company_id in (select public.get_my_company_ids())
    )
  );

-- Allow authenticated company members to delete ITP sessions
create policy itp_sessions_delete on public.itp_sessions
  for delete to authenticated
  using (company_id in (select public.get_my_company_ids()));
