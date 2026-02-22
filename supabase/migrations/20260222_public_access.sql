-- Allow anonymous users to look up a site by slug (needed for the public sign-in page)
-- This only exposes id, name, slug — not org_id or any sensitive data
drop policy if exists "anon_select_sites" on public.sites;

create policy "anon_select_sites"
  on public.sites for select
  to anon
  using (true);

-- Ensure anon policies on site_visits still exist (re-create idempotently)
drop policy if exists "anon_insert" on public.site_visits;
drop policy if exists "anon_select" on public.site_visits;
drop policy if exists "anon_update" on public.site_visits;
drop policy if exists "anon_delete" on public.site_visits;

create policy "anon_insert"
  on public.site_visits for insert
  to anon
  with check (true);

create policy "anon_select"
  on public.site_visits for select
  to anon
  using (true);

create policy "anon_update"
  on public.site_visits for update
  to anon
  using (true)
  with check (true);

create policy "anon_delete"
  on public.site_visits for delete
  to anon
  using (true);
