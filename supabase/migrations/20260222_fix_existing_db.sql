-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  RUN THIS in Supabase SQL Editor to fix the existing database             ║
-- ║  Safe to run multiple times (idempotent)                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── 1. Create tables FIRST (so DROP POLICY doesn't fail on missing tables) ──

create table if not exists public.organisations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);
alter table public.organisations enable row level security;

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

-- ─── 2. Ensure columns exist ─────────────────────────────────────────────────

alter table public.sites
  add column if not exists org_id uuid references public.organisations(id) on delete cascade;

do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'sites' and column_name = 'user_id') then
    alter table public.sites drop column user_id;
  end if;
end $$;

alter table public.site_visits
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

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

-- ─── 3. Drop ALL old policies (tables guaranteed to exist now) ───────────────

-- site_visits
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

-- sites
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

-- organisations
drop policy if exists "org_members_select_orgs" on public.organisations;
drop policy if exists "org_insert" on public.organisations;
drop policy if exists "org_admin_update" on public.organisations;

-- org_members
drop policy if exists "org_members_select" on public.org_members;
drop policy if exists "org_members_insert" on public.org_members;
drop policy if exists "org_members_update" on public.org_members;
drop policy if exists "org_members_delete" on public.org_members;

-- ─── 4. Helper functions (SECURITY DEFINER — bypass RLS) ─────────────────────
--    These prevent infinite recursion when org_members policies reference
--    org_members itself.

create or replace function public.get_my_org_ids()
returns setof uuid
language plpgsql security definer set search_path = public, auth, extensions
as $$
begin
  return query select org_id from public.org_members where user_id = auth.uid();
end;
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language plpgsql security definer set search_path = public, auth, extensions
as $$
begin
  return exists(
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and role = 'admin'
  );
end;
$$;

create or replace function public.org_has_members(p_org_id uuid)
returns boolean
language plpgsql security definer set search_path = public, auth, extensions
as $$
begin
  return exists(select 1 from public.org_members where org_id = p_org_id);
end;
$$;

create or replace function public.get_my_site_id(p_org_id uuid)
returns uuid
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare
  result uuid;
begin
  select site_id into result from public.org_members
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;
  return result;
end;
$$;

-- ─── 5. Policies (using helper functions) ─────────────────────────────────────

-- organisations
create policy "org_members_select_orgs"
  on public.organisations for select to authenticated
  using (id in (select public.get_my_org_ids()));

create policy "org_insert"
  on public.organisations for insert to authenticated
  with check (true);

create policy "org_admin_update"
  on public.organisations for update to authenticated
  using (public.is_org_admin(id));

-- org_members (NO self-referencing subqueries — uses helper functions)
create policy "org_members_select"
  on public.org_members for select to authenticated
  using (org_id in (select public.get_my_org_ids()));

create policy "org_members_insert"
  on public.org_members for insert to authenticated
  with check (
    public.is_org_admin(org_id) or not public.org_has_members(org_id)
  );

create policy "org_members_update"
  on public.org_members for update to authenticated
  using (public.is_org_admin(org_id));

create policy "org_members_delete"
  on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));

-- sites
create policy "anon_select_sites"
  on public.sites for select to anon using (true);

create policy "auth_select_sites"
  on public.sites for select to authenticated
  using (
    org_id in (select public.get_my_org_ids())
    and (public.is_org_admin(org_id) or id = public.get_my_site_id(org_id))
  );

create policy "auth_insert_sites"
  on public.sites for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy "auth_update_sites"
  on public.sites for update to authenticated
  using (public.is_org_admin(org_id));

create policy "auth_delete_sites"
  on public.sites for delete to authenticated
  using (public.is_org_admin(org_id));

-- site_visits (BOTH anon AND authenticated)
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
