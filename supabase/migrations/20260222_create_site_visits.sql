-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SiteSign — Full Schema (run this ONCE in Supabase SQL Editor)            ║
-- ║  Covers: organisations, org_members, sites, site_visits                   ║
-- ║  Handles: anon + authenticated roles, org-scoped RLS                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── 1. Organisations ─────────────────────────────────────────────────────────

create table if not exists public.organisations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- Members can read their own org
create policy "org_members_select_orgs"
  on public.organisations for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = organisations.id
        and org_members.user_id = auth.uid()
    )
  );

-- Any authenticated user can create an org (becomes admin via app logic)
create policy "org_insert"
  on public.organisations for insert to authenticated
  with check (true);

-- Only org admins can update org details
create policy "org_admin_update"
  on public.organisations for update to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = organisations.id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- ─── 2. Org Members ──────────────────────────────────────────────────────────

create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organisations(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null check (role in ('admin', 'editor')),
  site_id    uuid,  -- nullable; editors are locked to one site
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.org_members enable row level security;

-- Org members can see all members of their org
create policy "org_members_select"
  on public.org_members for select to authenticated
  using (
    org_id in (
      select om2.org_id from public.org_members om2
      where om2.user_id = auth.uid()
    )
  );

-- Org admins can insert new members
create policy "org_members_insert"
  on public.org_members for insert to authenticated
  with check (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
        and om2.user_id = auth.uid()
        and om2.role = 'admin'
    )
    -- OR this is the first member (creator becoming admin)
    or not exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
    )
  );

-- Org admins can update members
create policy "org_members_update"
  on public.org_members for update to authenticated
  using (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
        and om2.user_id = auth.uid()
        and om2.role = 'admin'
    )
  );

-- Org admins can remove members
create policy "org_members_delete"
  on public.org_members for delete to authenticated
  using (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
        and om2.user_id = auth.uid()
        and om2.role = 'admin'
    )
  );

-- ─── 3. Sites ─────────────────────────────────────────────────────────────────

create table if not exists public.sites (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  org_id     uuid        references public.organisations(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.sites enable row level security;

-- Anon can look up a site by slug (needed for QR code / public sign-in page)
create policy "anon_select_sites"
  on public.sites for select to anon using (true);

-- Authenticated: admins see all org sites; editors see only their assigned site
create policy "auth_select_sites"
  on public.sites for select to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and (org_members.role = 'admin' or org_members.site_id = sites.id)
    )
  );

-- Only org admins can create sites
create policy "auth_insert_sites"
  on public.sites for insert to authenticated
  with check (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Only org admins can update sites
create policy "auth_update_sites"
  on public.sites for update to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Only org admins can delete sites
create policy "auth_delete_sites"
  on public.sites for delete to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- ─── 4. Site Visits ───────────────────────────────────────────────────────────

create table if not exists public.site_visits (
  id             uuid        primary key default gen_random_uuid(),
  full_name      text        not null,
  company_name   text        not null,
  visitor_type   text        not null check (visitor_type in ('Worker', 'Subcontractor', 'Visitor', 'Delivery')),
  signed_in_at   timestamptz not null default now(),
  signed_out_at  timestamptz,
  site_id        uuid        references public.sites(id) on delete cascade
);

alter table public.site_visits enable row level security;

-- Anon: public visitors can insert, read, update (sign-out), and delete
create policy "anon_insert_visits"
  on public.site_visits for insert to anon with check (true);

create policy "anon_select_visits"
  on public.site_visits for select to anon using (true);

create policy "anon_update_visits"
  on public.site_visits for update to anon using (true) with check (true);

create policy "anon_delete_visits"
  on public.site_visits for delete to anon using (true);

-- Authenticated: admins/editors can do everything on site_visits
-- (their site access is already scoped by the app querying via site_id)
create policy "auth_insert_visits"
  on public.site_visits for insert to authenticated with check (true);

create policy "auth_select_visits"
  on public.site_visits for select to authenticated using (true);

create policy "auth_update_visits"
  on public.site_visits for update to authenticated using (true) with check (true);

create policy "auth_delete_visits"
  on public.site_visits for delete to authenticated using (true);
