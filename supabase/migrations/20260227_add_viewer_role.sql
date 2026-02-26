-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  ADD VIEWER ROLE & UPDATE PERMISSIONS                                      ║
-- ║  Run this in Supabase SQL Editor to add viewer role support                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── STEP 1: Update org_members table to support viewer role ─────────────────

-- Drop the existing check constraint
alter table public.org_members 
  drop constraint if exists org_members_role_check;

-- Add new check constraint with viewer role
alter table public.org_members 
  add constraint org_members_role_check 
  check (role in ('admin', 'editor', 'viewer'));

-- ─── STEP 2: Create/update security definer helper functions ────────────────

-- Helper to get user's org IDs (bypasses RLS to avoid recursion)
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

-- Helper to check if user is admin of an org
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

-- Helper to check if user is admin or editor for a site
create or replace function public.can_manage_site(p_site_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return exists (
    select 1 from public.sites s
    inner join public.org_members m on s.org_id = m.org_id
    where s.id = p_site_id
      and m.user_id = auth.uid()
      and (
        m.role = 'admin'
        or (m.role = 'editor' and m.site_id = p_site_id)
      )
  );
end;
$$;

grant execute on function public.get_my_org_ids() to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.can_manage_site(uuid) to authenticated;

-- ─── STEP 3: Update RLS policies for viewer role ─────────────────────────────

-- Drop existing policies
drop policy if exists "org_members_select" on public.org_members;
drop policy if exists "org_members_insert" on public.org_members;
drop policy if exists "org_members_update" on public.org_members;
drop policy if exists "org_members_delete" on public.org_members;

drop policy if exists "sites_select" on public.sites;
drop policy if exists "sites_insert" on public.sites;
drop policy if exists "sites_update" on public.sites;
drop policy if exists "sites_delete" on public.sites;

drop policy if exists "site_visits_select" on public.site_visits;
drop policy if exists "site_visits_insert" on public.site_visits;
drop policy if exists "site_visits_update" on public.site_visits;
drop policy if exists "site_visits_delete" on public.site_visits;

-- Recreate org_members policies using helper functions
create policy "org_members_select" on public.org_members
  for select using (org_id in (select public.get_my_org_ids()));

create policy "org_members_insert" on public.org_members
  for insert with check (public.is_org_admin(org_id));

create policy "org_members_update" on public.org_members
  for update using (public.is_org_admin(org_id));

create policy "org_members_delete" on public.org_members
  for delete using (public.is_org_admin(org_id));

-- Recreate sites policies using helper functions
create policy "sites_select" on public.sites
  for select using (org_id in (select public.get_my_org_ids()));

create policy "sites_insert" on public.sites
  for insert with check (public.is_org_admin(org_id));

create policy "sites_update" on public.sites
  for update using (public.can_manage_site(id));

create policy "sites_delete" on public.sites
  for delete using (public.is_org_admin(org_id));

-- Helper to get sites user can view
create or replace function public.get_my_site_ids()
returns setof uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return query
    select s.id from public.sites s
    inner join public.org_members m on s.org_id = m.org_id
    where m.user_id = auth.uid();
end;
$$;

grant execute on function public.get_my_site_ids() to authenticated;

-- Recreate site_visits policies using helper functions
create policy "site_visits_select" on public.site_visits
  for select using (site_id in (select public.get_my_site_ids()));

create policy "site_visits_insert" on public.site_visits
  for insert with check (public.can_manage_site(site_id));

create policy "site_visits_update" on public.site_visits
  for update using (public.can_manage_site(site_id));

create policy "site_visits_delete" on public.site_visits
  for delete using (
    site_id in (
      select s.id from public.sites s
      where public.is_org_admin(s.org_id)
    )
  );

-- ─── STEP 4: Update organisations policies ───────────────────────────────────

drop policy if exists "organisations_select" on public.organisations;
drop policy if exists "organisations_insert" on public.organisations;
drop policy if exists "organisations_update" on public.organisations;
drop policy if exists "organisations_delete" on public.organisations;

-- Recreate organisations policies using helper functions
create policy "organisations_select" on public.organisations
  for select using (id in (select public.get_my_org_ids()));

create policy "organisations_insert" on public.organisations
  for insert with check (auth.uid() is not null);

create policy "organisations_update" on public.organisations
  for update using (public.is_org_admin(id));

create policy "organisations_delete" on public.organisations
  for delete using (public.is_org_admin(id));
