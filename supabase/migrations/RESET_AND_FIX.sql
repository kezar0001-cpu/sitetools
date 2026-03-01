-- ================================================================================
-- SITESIGN - FULL RESET & FIX (v3.0 - Clean Redesign)
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Safe to run multiple times. Drops and recreates all policies/functions.
-- ================================================================================

-- --------- STEP 0a: Drop ALL policies first (they depend on functions) ---------------------------------------

do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

-- --------- STEP 0b: Drop all functions (now safe --- no dependents) ------------------------------------------------------

drop function if exists public.get_my_org_ids();
drop function if exists public.is_org_admin(uuid);
drop function if exists public.org_has_members(uuid);
drop function if exists public.get_my_site_id(uuid);
drop function if exists public.generate_org_join_code(uuid, int);
drop function if exists public.join_by_code(text, uuid);
drop function if exists public.get_user_by_email(text);
drop function if exists public.get_user_by_id(uuid);
drop function if exists public.approve_join_request(uuid, text, uuid);
drop function if exists public.accept_invitation(uuid);
drop function if exists public.request_org_deletion(uuid, text);
drop function if exists public.accept_org_transfer(uuid);

-- --------- STEP 1: Create tables ------------------------------------------------------------------------------------------------------------------------------------------------------

create table if not exists public.organisations (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  description       text,
  is_public         boolean     not null default false,
  join_code         text,
  join_code_expires timestamptz,
  created_by        uuid,
  created_at        timestamptz not null default now()
);

create table if not exists public.sites (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  slug                text        not null unique,
  org_id              uuid,
  created_by          uuid,
  logo_url            text,
  latitude            double precision,
  longitude           double precision,
  geofence_radius_km  numeric     not null default 1,
  created_at          timestamptz not null default now()
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
  id                     uuid        primary key default gen_random_uuid(),
  full_name              text        not null,
  company_name           text        not null,
  phone_number           text,
  visitor_type           text        not null check (visitor_type in ('Worker', 'Subcontractor', 'Visitor', 'Delivery')),
  signed_in_at           timestamptz not null default now(),
  signed_out_at          timestamptz,
  site_id                uuid,
  signature              text,
  push_subscription      jsonb,
  geofence_notified_at   timestamptz,
  geofence_snoozed_until timestamptz
);

create table if not exists public.org_join_requests (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null,
  user_id     uuid        not null,
  message     text,
  status      text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  unique (org_id, user_id)
);

create table if not exists public.org_member_sites (
  id            uuid primary key default gen_random_uuid(),
  org_member_id uuid not null,
  site_id       uuid not null,
  unique (org_member_id, site_id)
);

-- Add columns safely to existing tables (idempotent)
alter table public.site_visits add column if not exists signature text;
alter table public.site_visits add column if not exists phone_number text;
alter table public.site_visits add column if not exists push_subscription jsonb;
alter table public.site_visits add column if not exists geofence_notified_at timestamptz;
alter table public.site_visits add column if not exists geofence_snoozed_until timestamptz;
alter table public.sites add column if not exists created_by uuid;
alter table public.sites add column if not exists latitude double precision;
alter table public.sites add column if not exists longitude double precision;
alter table public.sites add column if not exists geofence_radius_km numeric default 1;
alter table public.organisations add column if not exists created_by uuid;

-- --------- STEP 2: Foreign keys (safe --- only adds if missing) ---------------------------------------------------------------

do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'sites_org_id_fkey') then
    alter table public.sites add constraint sites_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_members_org_id_fkey') then
    alter table public.org_members add constraint org_members_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'site_visits_site_id_fkey') then
    alter table public.site_visits add constraint site_visits_site_id_fkey foreign key (site_id) references public.sites(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_join_requests_org_id_fkey') then
    alter table public.org_join_requests add constraint org_join_requests_org_id_fkey foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_member_sites_org_member_id_fkey') then
    alter table public.org_member_sites add constraint org_member_sites_org_member_id_fkey foreign key (org_member_id) references public.org_members(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'org_member_sites_site_id_fkey') then
    alter table public.org_member_sites add constraint org_member_sites_site_id_fkey foreign key (site_id) references public.sites(id) on delete cascade;
  end if;
end $$;

-- --------- STEP 3: Enable RLS + grants ------------------------------------------------------------------------------------------------------------------------------------

alter table public.organisations     enable row level security;
alter table public.org_members       enable row level security;
alter table public.sites             enable row level security;
alter table public.site_visits       enable row level security;
alter table public.org_join_requests enable row level security;
alter table public.org_member_sites  enable row level security;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select, insert, update, delete on public.sites to anon;
grant select, insert, update, delete on public.site_visits to anon;

-- --------- STEP 4: SECURITY DEFINER helper functions ------------------------------------------------------------------------------------------
-- These run with creator privileges to avoid RLS recursion and auth.users access issues.

-- Returns org IDs for the current user (used in RLS policies)
create or replace function public.get_my_org_ids()
returns setof uuid language plpgsql security definer
set search_path = public
as $$
begin
  return query select org_id from public.org_members where user_id = auth.uid();
end;
$$;

-- Checks if current user is admin of given org
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean language plpgsql security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and role = 'admin'
  );
end;
$$;

-- Safely gets user email by ID (wraps auth.users which is not accessible to authenticated role)
create or replace function public.get_user_by_id(p_user_id uuid)
returns table(id uuid, email text) language plpgsql security definer
set search_path = public, auth
as $$
begin
  return query select u.id, u.email::text from auth.users u where u.id = p_user_id;
end;
$$;

-- Safely gets user by email
create or replace function public.get_user_by_email(p_email text)
returns table(id uuid, email text) language plpgsql security definer
set search_path = public, auth
as $$
begin
  return query select u.id, u.email::text from auth.users u where u.email = p_email;
end;
$$;

-- Generates a join code for an org (admin only)
create or replace function public.generate_org_join_code(p_org_id uuid, p_expires_hours int default 168)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_code text;
begin
  if not public.is_org_admin(p_org_id) then
    return json_build_object('success', false, 'message', 'Not authorized');
  end if;
  v_code := upper(substring(md5(random()::text || now()::text) from 1 for 12));
  update public.organisations
  set join_code = v_code, join_code_expires = now() + (p_expires_hours || ' hours')::interval
  where id = p_org_id;
  return json_build_object('success', true, 'join_code', v_code);
end;
$$;

-- User joins an org via join code
create or replace function public.join_by_code(p_join_code text, p_user_id uuid)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_org public.organisations%rowtype;
begin
  select * into v_org from public.organisations
  where join_code = upper(p_join_code) and join_code_expires > now();
  if not found then
    return json_build_object('success', false, 'message', 'Invalid or expired join code');
  end if;
  -- Check if already a member
  if exists (select 1 from public.org_members where org_id = v_org.id and user_id = p_user_id) then
    return json_build_object('success', false, 'message', 'You are already a member of this organization');
  end if;
  insert into public.org_members (org_id, user_id, role) values (v_org.id, p_user_id, 'viewer');
  return json_build_object('success', true, 'message', 'Successfully joined ' || v_org.name);
end;
$$;

-- Admin approves a join request
create or replace function public.approve_join_request(p_request_id uuid, p_role text, p_site_id uuid default null)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_request public.org_join_requests%rowtype;
begin
  select * into v_request from public.org_join_requests where id = p_request_id;
  if not found then
    return json_build_object('success', false, 'message', 'Request not found');
  end if;
  if not public.is_org_admin(v_request.org_id) then
    return json_build_object('success', false, 'message', 'Not authorized');
  end if;
  update public.org_join_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;
  insert into public.org_members (org_id, user_id, role, site_id)
  values (v_request.org_id, v_request.user_id, p_role, p_site_id)
  on conflict (org_id, user_id) do update set role = excluded.role, site_id = excluded.site_id;
  return json_build_object('success', true, 'message', 'Request approved');
end;
$$;

-- Grant execute on all functions to authenticated role
grant execute on function public.get_my_org_ids()                       to authenticated;
grant execute on function public.is_org_admin(uuid)                     to authenticated;
grant execute on function public.get_user_by_id(uuid)                   to authenticated;
grant execute on function public.get_user_by_email(text)                to authenticated;
grant execute on function public.generate_org_join_code(uuid, int)      to authenticated;
grant execute on function public.join_by_code(text, uuid)               to authenticated;
grant execute on function public.approve_join_request(uuid, text, uuid) to authenticated;

-- --------- STEP 5: Drop ALL existing policies (clean slate) ------------------------------------------------------------------------

do $$
declare pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

-- --------- STEP 6: Create all RLS policies ---------------------------------------------------------------------------------------------------------------------------

-- === organisations ===
-- Members can read their own org; anyone can browse public orgs
create policy "org_select" on public.organisations for select to authenticated
  using (id in (select public.get_my_org_ids()) or is_public = true);
-- Any authenticated user can create an org
create policy "org_insert" on public.organisations for insert to authenticated
  with check (true);
-- Only admins can update their org
create policy "org_update" on public.organisations for update to authenticated
  using (public.is_org_admin(id));

-- === org_members ===
-- Members see all members in their org
create policy "members_select" on public.org_members for select to authenticated
  using (org_id in (select public.get_my_org_ids()));
-- Admin can add members; first user (org creator) can insert themselves
create policy "members_insert" on public.org_members for insert to authenticated
  with check (public.is_org_admin(org_id) or user_id = auth.uid());
-- Only admins can update roles
create policy "members_update" on public.org_members for update to authenticated
  using (public.is_org_admin(org_id));
-- Only admins can remove members
create policy "members_delete" on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));

-- === sites ===
-- Anon can read sites (needed for QR code sign-in page)
create policy "sites_anon_select" on public.sites for select to anon using (true);
-- Authenticated see their org's sites OR their own personal sites
create policy "sites_auth_select" on public.sites for select to authenticated
  using (
    org_id in (select public.get_my_org_ids())
    or (org_id is null and created_by = auth.uid())
  );
-- Org admins can create org sites; any user can create personal sites (org_id is null)
create policy "sites_insert" on public.sites for insert to authenticated
  with check (
    (org_id is not null and public.is_org_admin(org_id))
    or (org_id is null and created_by = auth.uid())
  );
create policy "sites_update" on public.sites for update to authenticated
  using (
    (org_id is not null and public.is_org_admin(org_id))
    or (org_id is null and created_by = auth.uid())
  );
create policy "sites_delete" on public.sites for delete to authenticated
  using (
    (org_id is not null and public.is_org_admin(org_id))
    or (org_id is null and created_by = auth.uid())
  );

-- === site_visits ===
-- Anon: full CRUD (public visitors sign in/out via QR code)
create policy "visits_anon_select" on public.site_visits for select to anon using (true);
create policy "visits_anon_insert" on public.site_visits for insert to anon with check (true);
create policy "visits_anon_update" on public.site_visits for update to anon using (true) with check (true);
create policy "visits_anon_delete" on public.site_visits for delete to anon using (true);
-- Authenticated: scoped to their org's sites OR their personal sites
create policy "visits_auth_select" on public.site_visits for select to authenticated
  using (site_id in (
    select id from public.sites
    where org_id in (select public.get_my_org_ids())
       or (org_id is null and created_by = auth.uid())
  ));
create policy "visits_auth_insert" on public.site_visits for insert to authenticated with check (true);
create policy "visits_auth_update" on public.site_visits for update to authenticated
  using (site_id in (
    select id from public.sites
    where org_id in (select public.get_my_org_ids())
       or (org_id is null and created_by = auth.uid())
  ));
create policy "visits_auth_delete" on public.site_visits for delete to authenticated
  using (site_id in (
    select id from public.sites
    where org_id in (select public.get_my_org_ids())
       or (org_id is null and created_by = auth.uid())
  ));

-- === org_join_requests ===
-- Admins see requests for their org; users see their own requests
create policy "joinreq_select" on public.org_join_requests for select to authenticated
  using (public.is_org_admin(org_id) or user_id = auth.uid());
-- Users can create their own requests
create policy "joinreq_insert" on public.org_join_requests for insert to authenticated
  with check (user_id = auth.uid());
-- Only admins can update (approve/reject)
create policy "joinreq_update" on public.org_join_requests for update to authenticated
  using (public.is_org_admin(org_id));
-- Users can cancel their own pending requests
create policy "joinreq_delete" on public.org_join_requests for delete to authenticated
  using (user_id = auth.uid());

-- === org_member_sites ===
-- Members see site assignments in their org
create policy "membersites_select" on public.org_member_sites for select to authenticated
  using (org_member_id in (
    select id from public.org_members where org_id in (select public.get_my_org_ids())
  ));
-- Only admins can manage site assignments
create policy "membersites_admin" on public.org_member_sites for all to authenticated
  using (org_member_id in (
    select id from public.org_members
    where org_id in (select org_id from public.org_members where user_id = auth.uid() and role = 'admin')
  ));

-- --------- DONE ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
-- Verify with:
--   select schemaname, tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname;
--   select routine_name from information_schema.routines where routine_schema = 'public' and routine_type = 'FUNCTION';
