-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  RUN THIS in Supabase SQL Editor to fix the existing database             ║
-- ║  Safe to run multiple times (idempotent)                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── 1. Drop ALL old policies ─────────────────────────────────────────────────

-- site_visits old policies
drop policy if exists "anon_insert" on public.site_visits;
drop policy if exists "anon_select" on public.site_visits;
drop policy if exists "anon_update" on public.site_visits;
drop policy if exists "anon_delete" on public.site_visits;
drop policy if exists "anon_insert_visits" on public.site_visits;
drop policy if exists "anon_select_visits" on public.site_visits;
drop policy if exists "anon_update_visits" on public.site_visits;
drop policy if exists "anon_delete_visits" on public.site_visits;
drop policy if exists "auth_insert_visits" on public.site_visits;
drop policy if exists "auth_select_visits" on public.site_visits;
drop policy if exists "auth_update_visits" on public.site_visits;
drop policy if exists "auth_delete_visits" on public.site_visits;
drop policy if exists "anon_delete_site_visits" on public.site_visits;

-- sites old policies
drop policy if exists "anon_select_sites" on public.sites;
drop policy if exists "anon_insert_sites" on public.sites;
drop policy if exists "auth_insert_sites" on public.sites;
drop policy if exists "auth_select_sites" on public.sites;
drop policy if exists "auth_update_sites" on public.sites;
drop policy if exists "auth_delete_sites" on public.sites;
drop policy if exists "org_admin_insert_sites" on public.sites;
drop policy if exists "org_select_sites" on public.sites;
drop policy if exists "org_admin_update_sites" on public.sites;
drop policy if exists "org_admin_delete_sites" on public.sites;

-- organisations old policies
drop policy if exists "org_members_select" on public.organisations;
drop policy if exists "org_members_select_orgs" on public.organisations;
drop policy if exists "org_insert" on public.organisations;
drop policy if exists "org_admin_update" on public.organisations;

-- org_members old policies
drop policy if exists "org_members_select" on public.org_members;
drop policy if exists "org_members_insert" on public.org_members;
drop policy if exists "org_members_update" on public.org_members;
drop policy if exists "org_members_delete" on public.org_members;

-- ─── 2. Create organisations table ───────────────────────────────────────────

create table if not exists public.organisations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);
alter table public.organisations enable row level security;

-- ─── 3. Create org_members table ─────────────────────────────────────────────

create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organisations(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null check (role in ('admin', 'editor')),
  site_id    uuid,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
alter table public.org_members enable row level security;

-- ─── 4. Ensure sites table has org_id column ─────────────────────────────────

alter table public.sites
  add column if not exists org_id uuid references public.organisations(id) on delete cascade;

-- Drop old user_id column if it exists (replaced by org membership)
-- (keeping this safe — won't fail if column doesn't exist)
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'sites' and column_name = 'user_id') then
    alter table public.sites drop column user_id;
  end if;
end $$;

-- ─── 5. Ensure site_visits table has site_id column ──────────────────────────

alter table public.site_visits
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

-- ─── 6. Add org_members FK for site_id ───────────────────────────────────────

-- Add FK constraint from org_members.site_id to sites.id if not already there
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'org_members' and constraint_type = 'FOREIGN KEY'
      and constraint_name = 'org_members_site_id_fkey'
  ) then
    alter table public.org_members
      add constraint org_members_site_id_fkey
      foreign key (site_id) references public.sites(id) on delete set null;
  end if;
end $$;

-- ─── 7. Create ALL policies fresh ────────────────────────────────────────────

-- organisations
create policy "org_members_select_orgs"
  on public.organisations for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = organisations.id and org_members.user_id = auth.uid()
  ));

create policy "org_insert"
  on public.organisations for insert to authenticated
  with check (true);

create policy "org_admin_update"
  on public.organisations for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = organisations.id and org_members.user_id = auth.uid() and org_members.role = 'admin'
  ));

-- org_members
create policy "org_members_select"
  on public.org_members for select to authenticated
  using (org_id in (select om2.org_id from public.org_members om2 where om2.user_id = auth.uid()));

create policy "org_members_insert"
  on public.org_members for insert to authenticated
  with check (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id and om2.user_id = auth.uid() and om2.role = 'admin'
    )
    or not exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
    )
  );

create policy "org_members_update"
  on public.org_members for update to authenticated
  using (exists (
    select 1 from public.org_members om2
    where om2.org_id = org_members.org_id and om2.user_id = auth.uid() and om2.role = 'admin'
  ));

create policy "org_members_delete"
  on public.org_members for delete to authenticated
  using (exists (
    select 1 from public.org_members om2
    where om2.org_id = org_members.org_id and om2.user_id = auth.uid() and om2.role = 'admin'
  ));

-- sites
create policy "anon_select_sites"
  on public.sites for select to anon using (true);

create policy "auth_select_sites"
  on public.sites for select to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = sites.org_id and org_members.user_id = auth.uid()
      and (org_members.role = 'admin' or org_members.site_id = sites.id)
  ));

create policy "auth_insert_sites"
  on public.sites for insert to authenticated
  with check (exists (
    select 1 from public.org_members
    where org_members.org_id = sites.org_id and org_members.user_id = auth.uid() and org_members.role = 'admin'
  ));

create policy "auth_update_sites"
  on public.sites for update to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = sites.org_id and org_members.user_id = auth.uid() and org_members.role = 'admin'
  ));

create policy "auth_delete_sites"
  on public.sites for delete to authenticated
  using (exists (
    select 1 from public.org_members
    where org_members.org_id = sites.org_id and org_members.user_id = auth.uid() and org_members.role = 'admin'
  ));

-- site_visits (BOTH anon AND authenticated — this was the 403 bug)
create policy "anon_insert_visits"
  on public.site_visits for insert to anon with check (true);
create policy "anon_select_visits"
  on public.site_visits for select to anon using (true);
create policy "anon_update_visits"
  on public.site_visits for update to anon using (true) with check (true);
create policy "anon_delete_visits"
  on public.site_visits for delete to anon using (true);

create policy "auth_insert_visits"
  on public.site_visits for insert to authenticated with check (true);
create policy "auth_select_visits"
  on public.site_visits for select to authenticated using (true);
create policy "auth_update_visits"
  on public.site_visits for update to authenticated using (true) with check (true);
create policy "auth_delete_visits"
  on public.site_visits for delete to authenticated using (true);
