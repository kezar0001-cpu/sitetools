-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SITESIGN — FULL RESET & FIX (v2.0)                                       ║
-- ║  Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)     ║
-- ║  Safe to run multiple times. Drops and recreates all policies/functions.  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── STEP 0: Drop functions with changing signatures ─────────────────────────
-- Required to prevent "ERROR: 42P13: cannot change return type"
drop function if exists public.generate_org_join_code(uuid, int);
drop function if exists public.approve_join_request(uuid, text, uuid);
drop function if exists public.get_user_by_email(text);
drop function if exists public.get_user_by_id(uuid);

-- ─── STEP 1: Create tables if they don't exist ───────────────────────────────

create table if not exists public.organisations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  description text,
  is_public  boolean     default false,
  join_code  text,
  join_code_expires timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sites (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  org_id     uuid,
  logo_url   text,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null,
  user_id    uuid        not null,
  role       text        not null check (role in ('admin', 'editor', 'viewer')),
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
  site_id       uuid,
  signature     text
);

create table if not exists public.org_invitations (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null,
  email      text        not null,
  role       text        not null check (role in ('admin', 'editor', 'viewer')),
  site_id    uuid,
  status     text        not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.org_join_requests (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null,
  user_id    uuid        not null,
  message    text,
  status     text        not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);

create table if not exists public.org_member_sites (
  id            uuid        primary key default gen_random_uuid(),
  org_member_id uuid        not null,
  site_id       uuid        not null,
  unique (org_member_id, site_id)
);

-- ─── STEP 2: Safe column and constraint management ───────────────────────────

alter table public.site_visits add column if not exists signature text;

-- Add foreign keys safely
do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'sites_org_id_fkey') then
    alter table public.sites add constraint sites_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_members_org_id_fkey') then
    alter table public.org_members add constraint org_members_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_invitations_org_id_fkey') then
    alter table public.org_invitations add constraint org_invitations_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_join_requests_org_id_fkey') then
    alter table public.org_join_requests add constraint org_join_requests_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

-- ─── STEP 3: RLS and Permissions ─────────────────────────────────────────────

alter table public.organisations enable row level security;
alter table public.org_members   enable row level security;
alter table public.sites         enable row level security;
alter table public.site_visits   enable row level security;
alter table public.org_invitations enable row level security;
alter table public.org_join_requests enable row level security;
alter table public.org_member_sites enable row level security;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- ─── STEP 4: Security Definer Functions ──────────────────────────────────────

create or replace function public.get_my_org_ids() returns setof uuid language plpgsql security definer as $$
begin return query select org_id from public.org_members where user_id = auth.uid(); end; $$;

create or replace function public.is_org_admin(p_org_id uuid) returns boolean language plpgsql security definer as $$
begin return exists (select 1 from public.org_members where org_id = p_org_id and user_id = auth.uid() and role = 'admin'); end; $$;

create or replace function public.generate_org_join_code(p_org_id uuid, p_expires_hours int default 168) returns json language plpgsql security definer as $$
declare v_code text;
begin
  if not public.is_org_admin(p_org_id) then return json_build_object('success', false, 'message', 'Not authorized'); end if;
  v_code := upper(substring(md5(random()::text) from 1 for 12));
  update public.organisations set join_code = v_code, join_code_expires = now() + (p_expires_hours || ' hours')::interval where id = p_org_id;
  return json_build_object('success', true, 'join_code', v_code);
end; $$;

create or replace function public.get_user_by_email(p_email text) returns table(id uuid, email text) language plpgsql security definer as $$
begin return query select u.id, u.email::text from auth.users u where u.email = p_email; end; $$;

create or replace function public.get_user_by_id(p_user_id uuid) returns table(id uuid, email text) language plpgsql security definer as $$
begin return query select u.id, u.email::text from auth.users u where u.id = p_user_id; end; $$;

create or replace function public.approve_join_request(p_request_id uuid, p_role text, p_site_id uuid default null) returns json language plpgsql security definer as $$
declare v_request public.org_join_requests%rowtype;
begin
  select * into v_request from public.org_join_requests where id = p_request_id;
  if not public.is_org_admin(v_request.org_id) then return json_build_object('success', false, 'message', 'Not authorized'); end if;
  update public.org_join_requests set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_request_id;
  insert into public.org_members (org_id, user_id, role, site_id) values (v_request.org_id, v_request.user_id, p_role, p_site_id)
  on conflict (org_id, user_id) do update set role = excluded.role, site_id = excluded.site_id;
  return json_build_object('success', true, 'message', 'Request approved');
end; $$;

-- Grant execute on all functions
grant execute on function public.get_my_org_ids() to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.generate_org_join_code(uuid, int) to authenticated;
grant execute on function public.get_user_by_email(text) to authenticated;
grant execute on function public.get_user_by_id(uuid) to authenticated;
grant execute on function public.approve_join_request(uuid, text, uuid) to authenticated;

-- ─── STEP 5: Policies ────────────────────────────────────────────────────────

-- Drop all known policies before recreating
drop policy if exists "org_members_select_orgs"       on public.organisations;
drop policy if exists "org_insert"                     on public.organisations;
drop policy if exists "org_admin_update"               on public.organisations;
drop policy if exists "org_members_select"             on public.org_members;
drop policy if exists "org_members_insert"             on public.org_members;
drop policy if exists "org_members_update"             on public.org_members;
drop policy if exists "org_members_delete"             on public.org_members;
drop policy if exists "anon_select_sites"              on public.sites;
drop policy if exists "auth_select_sites"              on public.sites;
drop policy if exists "auth_insert_sites"              on public.sites;
drop policy if exists "auth_update_sites"              on public.sites;
drop policy if exists "auth_delete_sites"              on public.sites;
drop policy if exists "anon_insert_visits"             on public.site_visits;
drop policy if exists "anon_select_visits"             on public.site_visits;
drop policy if exists "anon_update_visits"             on public.site_visits;
drop policy if exists "anon_delete_visits"             on public.site_visits;
drop policy if exists "auth_insert_visits"             on public.site_visits;
drop policy if exists "auth_select_visits"             on public.site_visits;
drop policy if exists "auth_update_visits"             on public.site_visits;
drop policy if exists "auth_delete_visits"             on public.site_visits;
drop policy if exists "org_admin_invitations"          on public.org_invitations;
drop policy if exists "user_read_own_invitations"      on public.org_invitations;
drop policy if exists "user_update_own_invitations"    on public.org_invitations;
drop policy if exists "org_admin_join_requests_select" on public.org_join_requests;
drop policy if exists "org_admin_join_requests_update" on public.org_join_requests;
drop policy if exists "auth_join_requests_insert"      on public.org_join_requests;
drop policy if exists "org_members_sites_select"       on public.org_member_sites;
drop policy if exists "org_admin_member_sites_all"     on public.org_member_sites;

-- organisations
create policy "org_members_select_orgs" on public.organisations for select to authenticated
  using (id in (select public.get_my_org_ids()));
create policy "org_insert" on public.organisations for insert to authenticated
  with check (true);
create policy "org_admin_update" on public.organisations for update to authenticated
  using (public.is_org_admin(id));

-- org_members
create policy "org_members_select" on public.org_members for select to authenticated
  using (org_id in (select public.get_my_org_ids()));
create policy "org_members_insert" on public.org_members for insert to authenticated
  with check (
    public.is_org_admin(org_id)
    or not exists (select 1 from public.org_members om where om.org_id = org_members.org_id)
  );
create policy "org_members_update" on public.org_members for update to authenticated
  using (public.is_org_admin(org_id));
create policy "org_members_delete" on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));

-- sites
create policy "anon_select_sites" on public.sites for select to anon using (true);
create policy "auth_select_sites" on public.sites for select to authenticated
  using (org_id in (select public.get_my_org_ids()));
create policy "auth_insert_sites" on public.sites for insert to authenticated
  with check (public.is_org_admin(org_id));
create policy "auth_update_sites" on public.sites for update to authenticated
  using (public.is_org_admin(org_id));
create policy "auth_delete_sites" on public.sites for delete to authenticated
  using (public.is_org_admin(org_id));

-- site_visits: anon (public visitors) full CRUD for sign-in/out flow
create policy "anon_insert_visits" on public.site_visits for insert to anon with check (true);
create policy "anon_select_visits" on public.site_visits for select to anon using (true);
create policy "anon_update_visits" on public.site_visits for update to anon using (true) with check (true);
create policy "anon_delete_visits" on public.site_visits for delete to anon using (true);

-- site_visits: authenticated scoped to their org's sites
create policy "auth_insert_visits" on public.site_visits for insert to authenticated with check (true);
create policy "auth_select_visits" on public.site_visits for select to authenticated
  using (site_id in (select id from public.sites where org_id in (select public.get_my_org_ids())));
create policy "auth_update_visits" on public.site_visits for update to authenticated using (true) with check (true);
create policy "auth_delete_visits" on public.site_visits for delete to authenticated using (true);

-- org_invitations: admins manage all; invited user can view/respond to their own
create policy "org_admin_invitations" on public.org_invitations for all to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));
create policy "user_read_own_invitations" on public.org_invitations for select to authenticated
  using (email = (select email from auth.users where id = auth.uid()));
create policy "user_update_own_invitations" on public.org_invitations for update to authenticated
  using (email = (select email from auth.users where id = auth.uid()))
  with check (email = (select email from auth.users where id = auth.uid()));

-- org_join_requests
create policy "org_admin_join_requests_select" on public.org_join_requests for select to authenticated
  using (public.is_org_admin(org_id) or user_id = auth.uid());
create policy "org_admin_join_requests_update" on public.org_join_requests for update to authenticated
  using (public.is_org_admin(org_id));
create policy "auth_join_requests_insert" on public.org_join_requests for insert to authenticated
  with check (user_id = auth.uid());

-- org_member_sites
create policy "org_members_sites_select" on public.org_member_sites for select to authenticated
  using (org_member_id in (
    select id from public.org_members where org_id in (select public.get_my_org_ids())
  ));
create policy "org_admin_member_sites_all" on public.org_member_sites for all to authenticated
  using (org_member_id in (
    select id from public.org_members
    where org_id in (select org_id from public.org_members where user_id = auth.uid() and role = 'admin')
  ));

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   select schemaname, tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname;
--   select routine_name from information_schema.routines where routine_schema = 'public' and routine_type = 'FUNCTION';