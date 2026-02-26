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

-- ─── STEP 2: Update RLS policies for viewer role ─────────────────────────────

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

-- Recreate org_members policies
-- All authenticated users can view members of their own org
create policy "org_members_select" on public.org_members
  for select using (
    org_id in (
      select org_id from public.org_members 
      where user_id = auth.uid()
    )
  );

-- Only admins can add new members
create policy "org_members_insert" on public.org_members
  for insert with check (
    exists (
      select 1 from public.org_members
      where org_id = org_members.org_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Only admins can update member roles
create policy "org_members_update" on public.org_members
  for update using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Only admins can remove members
create policy "org_members_delete" on public.org_members
  for delete using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_members.org_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Recreate sites policies
-- All org members can view sites in their org
create policy "sites_select" on public.sites
  for select using (
    org_id in (
      select org_id from public.org_members 
      where user_id = auth.uid()
    )
  );

-- Only admins can create sites
create policy "sites_insert" on public.sites
  for insert with check (
    exists (
      select 1 from public.org_members
      where org_id = sites.org_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Admins can update any site, editors can update their assigned site
create policy "sites_update" on public.sites
  for update using (
    exists (
      select 1 from public.org_members
      where org_id = sites.org_id
        and user_id = auth.uid()
        and (
          role = 'admin'
          or (role = 'editor' and site_id = sites.id)
        )
    )
  );

-- Only admins can delete sites
create policy "sites_delete" on public.sites
  for delete using (
    exists (
      select 1 from public.org_members
      where org_id = sites.org_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Recreate site_visits policies
-- All org members can view visits for sites in their org
create policy "site_visits_select" on public.site_visits
  for select using (
    site_id in (
      select s.id from public.sites s
      inner join public.org_members m on s.org_id = m.org_id
      where m.user_id = auth.uid()
    )
  );

-- Admins and editors can add visits to sites in their org
-- Editors can only add to their assigned site
create policy "site_visits_insert" on public.site_visits
  for insert with check (
    exists (
      select 1 from public.sites s
      inner join public.org_members m on s.org_id = m.org_id
      where s.id = site_visits.site_id
        and m.user_id = auth.uid()
        and (
          m.role = 'admin'
          or (m.role = 'editor' and m.site_id = s.id)
        )
    )
  );

-- Admins and editors can update visits
-- Editors can only update visits for their assigned site
create policy "site_visits_update" on public.site_visits
  for update using (
    exists (
      select 1 from public.sites s
      inner join public.org_members m on s.org_id = m.org_id
      where s.id = site_visits.site_id
        and m.user_id = auth.uid()
        and (
          m.role = 'admin'
          or (m.role = 'editor' and m.site_id = s.id)
        )
    )
  );

-- Only admins can delete visits
create policy "site_visits_delete" on public.site_visits
  for delete using (
    exists (
      select 1 from public.sites s
      inner join public.org_members m on s.org_id = m.org_id
      where s.id = site_visits.site_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- ─── STEP 3: Update organisations policies ───────────────────────────────────

drop policy if exists "organisations_select" on public.organisations;
drop policy if exists "organisations_insert" on public.organisations;
drop policy if exists "organisations_update" on public.organisations;
drop policy if exists "organisations_delete" on public.organisations;

-- All org members can view their org
create policy "organisations_select" on public.organisations
  for select using (
    id in (
      select org_id from public.org_members 
      where user_id = auth.uid()
    )
  );

-- Any authenticated user can create an org (they become admin)
create policy "organisations_insert" on public.organisations
  for insert with check (auth.uid() is not null);

-- Only admins can update org details
create policy "organisations_update" on public.organisations
  for update using (
    exists (
      select 1 from public.org_members
      where org_id = organisations.id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Only admins can delete org
create policy "organisations_delete" on public.organisations
  for delete using (
    exists (
      select 1 from public.org_members
      where org_id = organisations.id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );
