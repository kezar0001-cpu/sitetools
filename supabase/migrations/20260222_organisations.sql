-- ─── Organisations ────────────────────────────────────────────────────────────

create table if not exists public.organisations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- Members can read their own org
create policy "org_members_select"
  on public.organisations for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = organisations.id
        and org_members.user_id = auth.uid()
    )
  );

-- Any authenticated user can create an org (they become the first admin via trigger below)
create policy "org_insert"
  on public.organisations for insert
  to authenticated
  with check (true);

-- Only org admins can update org details
create policy "org_admin_update"
  on public.organisations for update
  to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = organisations.id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- ─── Org Members ──────────────────────────────────────────────────────────────

create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organisations(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null check (role in ('admin', 'editor')),
  site_id    uuid        references public.sites(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.org_members enable row level security;

-- Org admins can see all members of their org
create policy "org_members_select"
  on public.org_members for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
        and om2.user_id = auth.uid()
    )
  );

-- Org admins can insert new members
create policy "org_members_insert"
  on public.org_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
        and om2.user_id = auth.uid()
        and om2.role = 'admin'
    )
  );

-- Org admins can update members (e.g. change role or site assignment)
create policy "org_members_update"
  on public.org_members for update
  to authenticated
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
  on public.org_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.org_members om2
      where om2.org_id = org_members.org_id
        and om2.user_id = auth.uid()
        and om2.role = 'admin'
    )
  );

-- ─── Update sites to belong to an org (replace user_id with org_id) ───────────

alter table public.sites
  add column if not exists org_id uuid references public.organisations(id) on delete cascade;

-- Drop old user_id-based policies
drop policy if exists "auth_insert_sites" on public.sites;
drop policy if exists "auth_select_sites" on public.sites;
drop policy if exists "auth_update_sites" on public.sites;
drop policy if exists "auth_delete_sites" on public.sites;

-- Org admins can insert sites into their org
create policy "org_admin_insert_sites"
  on public.sites for insert
  to authenticated
  with check (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Org admins see all sites in their org; editors see only their assigned site
create policy "org_select_sites"
  on public.sites for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and (
          org_members.role = 'admin'
          or org_members.site_id = sites.id
        )
    )
  );

-- Only org admins can update/delete sites
create policy "org_admin_update_sites"
  on public.sites for update
  to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

create policy "org_admin_delete_sites"
  on public.sites for delete
  to authenticated
  using (
    exists (
      select 1 from public.org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );
