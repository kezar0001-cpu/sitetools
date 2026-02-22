-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SITESIGN — FULL RESET & FIX                                              ║
-- ║  Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)     ║
-- ║  Safe to run multiple times. Drops and recreates all policies/functions.  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── STEP 1: Create tables if they don't exist ───────────────────────────────

create table if not exists public.organisations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sites (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  org_id     uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null,
  user_id    uuid        not null,
  role       text        not null check (role in ('admin', 'editor')),
  site_id    uuid,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists public.site_visits (
  id            uuid        primary key default gen_random_uuid(),
  full_name     text        not null,
  company_name  text        not null,
  visitor_type  text        not null check (visitor_type in ('Worker', 'Subcontractor', 'Visitor', 'Delivery')),
  signed_in_at  timestamptz not null default now(),
  signed_out_at timestamptz,
  site_id       uuid
);

-- ─── STEP 2: Add missing columns & foreign keys safely ───────────────────────

alter table public.sites
  add column if not exists org_id uuid;

alter table public.site_visits
  add column if not exists site_id uuid;

-- Drop user_id from sites if it exists (old schema)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sites' and column_name = 'user_id'
  ) then
    alter table public.sites drop column user_id;
  end if;
end $$;

-- Add foreign keys only if they don't exist
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'organisations'
      and constraint_name = 'organisations_pkey'
  ) then
    alter table public.organisations add primary key (id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'sites'
      and constraint_name = 'sites_org_id_fkey'
  ) then
    alter table public.sites
      add constraint sites_org_id_fkey
      foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_members'
      and constraint_name = 'org_members_org_id_fkey'
  ) then
    alter table public.org_members
      add constraint org_members_org_id_fkey
      foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_members'
      and constraint_name = 'org_members_user_id_fkey'
  ) then
    alter table public.org_members
      add constraint org_members_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_members'
      and constraint_name = 'org_members_site_id_fkey'
  ) then
    alter table public.org_members
      add constraint org_members_site_id_fkey
      foreign key (site_id) references public.sites(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'site_visits'
      and constraint_name = 'site_visits_site_id_fkey'
  ) then
    alter table public.site_visits
      add constraint site_visits_site_id_fkey
      foreign key (site_id) references public.sites(id) on delete cascade;
  end if;
end $$;

-- ─── STEP 3: Enable RLS on all tables ────────────────────────────────────────

alter table public.organisations enable row level security;
alter table public.org_members   enable row level security;
alter table public.sites         enable row level security;
alter table public.site_visits   enable row level security;

-- ─── STEP 4: Drop ALL existing policies (every known name) ───────────────────

-- organisations
drop policy if exists "org_members_select_orgs"  on public.organisations;
drop policy if exists "org_insert"                on public.organisations;
drop policy if exists "org_admin_update"          on public.organisations;
drop policy if exists "authenticated_insert_orgs" on public.organisations;

-- org_members
drop policy if exists "org_members_select"  on public.org_members;
drop policy if exists "org_members_insert"  on public.org_members;
drop policy if exists "org_members_update"  on public.org_members;
drop policy if exists "org_members_delete"  on public.org_members;

-- sites
drop policy if exists "anon_select_sites"       on public.sites;
drop policy if exists "anon_insert_sites"        on public.sites;
drop policy if exists "auth_select_sites"        on public.sites;
drop policy if exists "auth_insert_sites"        on public.sites;
drop policy if exists "auth_update_sites"        on public.sites;
drop policy if exists "auth_delete_sites"        on public.sites;
drop policy if exists "org_admin_insert_sites"   on public.sites;
drop policy if exists "org_select_sites"         on public.sites;
drop policy if exists "org_admin_update_sites"   on public.sites;
drop policy if exists "org_admin_delete_sites"   on public.sites;

-- site_visits
drop policy if exists "anon_insert"           on public.site_visits;
drop policy if exists "anon_select"           on public.site_visits;
drop policy if exists "anon_update"           on public.site_visits;
drop policy if exists "anon_delete"           on public.site_visits;
drop policy if exists "anon_insert_visits"    on public.site_visits;
drop policy if exists "anon_select_visits"    on public.site_visits;
drop policy if exists "anon_update_visits"    on public.site_visits;
drop policy if exists "anon_delete_visits"    on public.site_visits;
drop policy if exists "auth_insert_visits"    on public.site_visits;
drop policy if exists "auth_select_visits"    on public.site_visits;
drop policy if exists "auth_update_visits"    on public.site_visits;
drop policy if exists "auth_delete_visits"    on public.site_visits;
drop policy if exists "anon_delete_site_visits" on public.site_visits;

-- ─── STEP 5: Create SECURITY DEFINER helper functions ────────────────────────
--    These bypass RLS internally, breaking the infinite recursion cycle.

create or replace function public.get_my_org_ids()
returns setof uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return query
    select org_id from public.org_members where user_id = auth.uid();
end;
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return exists (
    select 1 from public.org_members
    where org_id = p_org_id
      and user_id = auth.uid()
      and role = 'admin'
  );
end;
$$;

create or replace function public.org_has_members(p_org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return exists (
    select 1 from public.org_members where org_id = p_org_id
  );
end;
$$;

create or replace function public.get_my_site_id(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_site_id uuid;
begin
  select site_id into v_site_id
  from public.org_members
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;
  return v_site_id;
end;
$$;

-- ─── STEP 6: Create all RLS policies ─────────────────────────────────────────

-- organisations: members can read their own org
create policy "org_members_select_orgs"
  on public.organisations for select to authenticated
  using (id in (select public.get_my_org_ids()));

-- organisations: any authenticated user can create an org
create policy "org_insert"
  on public.organisations for insert to authenticated
  with check (true);

-- organisations: only org admins can update
create policy "org_admin_update"
  on public.organisations for update to authenticated
  using (public.is_org_admin(id));

-- org_members: members can see all members in their org
create policy "org_members_select"
  on public.org_members for select to authenticated
  using (org_id in (select public.get_my_org_ids()));

-- org_members: admin can add members; first member (org creator) can always insert
create policy "org_members_insert"
  on public.org_members for insert to authenticated
  with check (
    public.is_org_admin(org_id)
    or not public.org_has_members(org_id)
  );

-- org_members: only admins can update
create policy "org_members_update"
  on public.org_members for update to authenticated
  using (public.is_org_admin(org_id));

-- org_members: only admins can delete
create policy "org_members_delete"
  on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));

-- sites: anon can look up sites by slug (for QR code sign-in page)
create policy "anon_select_sites"
  on public.sites for select to anon
  using (true);

-- sites: authenticated — admins see all org sites; editors see only their site
create policy "auth_select_sites"
  on public.sites for select to authenticated
  using (
    org_id in (select public.get_my_org_ids())
    and (
      public.is_org_admin(org_id)
      or id = public.get_my_site_id(org_id)
    )
  );

-- sites: only org admins can create sites
create policy "auth_insert_sites"
  on public.sites for insert to authenticated
  with check (public.is_org_admin(org_id));

-- sites: only org admins can update sites
create policy "auth_update_sites"
  on public.sites for update to authenticated
  using (public.is_org_admin(org_id));

-- sites: only org admins can delete sites
create policy "auth_delete_sites"
  on public.sites for delete to authenticated
  using (public.is_org_admin(org_id));

-- site_visits: anon (public visitors) — full access for sign-in/out
create policy "anon_insert_visits"
  on public.site_visits for insert to anon
  with check (true);

create policy "anon_select_visits"
  on public.site_visits for select to anon
  using (true);

create policy "anon_update_visits"
  on public.site_visits for update to anon
  using (true) with check (true);

create policy "anon_delete_visits"
  on public.site_visits for delete to anon
  using (true);

-- site_visits: authenticated (admins/editors) — full access
create policy "auth_insert_visits"
  on public.site_visits for insert to authenticated
  with check (true);

create policy "auth_select_visits"
  on public.site_visits for select to authenticated
  using (true);

create policy "auth_update_visits"
  on public.site_visits for update to authenticated
  using (true) with check (true);

create policy "auth_delete_visits"
  on public.site_visits for delete to authenticated
  using (true);

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   select schemaname, tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname;
--   select routine_name from information_schema.routines where routine_schema = 'public' and routine_type = 'FUNCTION';
