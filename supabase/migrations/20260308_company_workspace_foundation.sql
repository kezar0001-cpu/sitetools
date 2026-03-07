-- Buildstate company/workspace foundation
-- Canonical model: profiles -> companies -> company_memberships -> sites/projects -> module records
-- This migration is idempotent and includes backfill from legacy organisations/org_members tables.

create extension if not exists pgcrypto;

-- 1) Role enum
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'company_role'
  ) then
    create type public.company_role as enum ('owner', 'admin', 'manager', 'member');
  end if;
end $$;

-- 2) Core tables
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone_number text,
  active_company_id uuid,
  active_site_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.company_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.company_role not null default 'member',
  token text not null unique,
  invite_code text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'on-hold', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

-- 3) Extend existing operational tables
alter table public.sites
  add column if not exists company_id uuid;

alter table public.site_visits
  add column if not exists company_id uuid;

alter table public.site_visits
  add column if not exists project_id uuid;

alter table public.site_visits
  add column if not exists created_by_user_id uuid;

alter table public.site_visits
  add column if not exists signed_in_by_user_id uuid;

-- 4) Foreign keys (safe-add)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_active_company_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_active_company_id_fkey
      foreign key (active_company_id) references public.companies(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_active_site_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_active_site_id_fkey
      foreign key (active_site_id) references public.sites(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'sites'
      and constraint_name = 'sites_company_id_fkey'
  ) then
    alter table public.sites
      add constraint sites_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'site_visits'
      and constraint_name = 'site_visits_company_id_fkey'
  ) then
    alter table public.site_visits
      add constraint site_visits_company_id_fkey
      foreign key (company_id) references public.companies(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'site_visits'
      and constraint_name = 'site_visits_project_id_fkey'
  ) then
    alter table public.site_visits
      add constraint site_visits_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'site_visits'
      and constraint_name = 'site_visits_created_by_user_id_fkey'
  ) then
    alter table public.site_visits
      add constraint site_visits_created_by_user_id_fkey
      foreign key (created_by_user_id) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'site_visits'
      and constraint_name = 'site_visits_signed_in_by_user_id_fkey'
  ) then
    alter table public.site_visits
      add constraint site_visits_signed_in_by_user_id_fkey
      foreign key (signed_in_by_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- 5) Backfill from legacy tables
do $$
begin
  if to_regclass('public.organisations') is not null then
    insert into public.companies (id, name, slug, owner_user_id, created_at, updated_at)
    select
      o.id,
      o.name,
      case
        when trim(regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g')) = '' then 'company-' || left(o.id::text, 8)
        else trim(both '-' from regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g')) || '-' || left(o.id::text, 8)
      end as slug,
      o.created_by,
      coalesce(o.created_at, now()),
      coalesce(o.created_at, now())
    from public.organisations o
    on conflict (id) do update
      set name = excluded.name;
  end if;
end $$;

do $$
begin
  if to_regclass('public.org_members') is not null then
    insert into public.company_memberships (company_id, user_id, role, created_at)
    select
      m.org_id,
      m.user_id,
      case
        when lower(m.role) = 'admin' then 'admin'::public.company_role
        when lower(m.role) = 'editor' then 'manager'::public.company_role
        else 'member'::public.company_role
      end,
      coalesce(m.created_at, now())
    from public.org_members m
    join public.companies c on c.id = m.org_id
    on conflict (company_id, user_id) do nothing;
  end if;
end $$;

-- Ensure company owner has owner membership
insert into public.company_memberships (company_id, user_id, role, created_at)
select c.id, c.owner_user_id, 'owner'::public.company_role, now()
from public.companies c
where c.owner_user_id is not null
  and not exists (
    select 1 from public.company_memberships cm
    where cm.company_id = c.id and cm.user_id = c.owner_user_id
  )
on conflict (company_id, user_id) do nothing;

update public.company_memberships cm
set role = 'owner'::public.company_role
from public.companies c
where c.owner_user_id is not null
  and cm.company_id = c.id
  and cm.user_id = c.owner_user_id;

do $$
declare
  has_token boolean;
  has_code boolean;
  has_invite_code boolean;
  has_invited_by boolean;
  has_accepted_by boolean;
  has_accepted_at boolean;
  token_expr text;
  invite_code_expr text;
  invited_by_expr text;
  accepted_by_expr text;
  accepted_at_expr text;
begin
  if to_regclass('public.org_invitations') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'org_invitations'
        and column_name = 'token'
    ) into has_token;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'org_invitations'
        and column_name = 'code'
    ) into has_code;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'org_invitations'
        and column_name = 'invite_code'
    ) into has_invite_code;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'org_invitations'
        and column_name = 'invited_by'
    ) into has_invited_by;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'org_invitations'
        and column_name = 'accepted_by'
    ) into has_accepted_by;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'org_invitations'
        and column_name = 'accepted_at'
    ) into has_accepted_at;

    token_expr := case when has_token then 'nullif(i.token, '''')' else 'null' end;

    invite_code_expr := case
      when has_invite_code then 'nullif(i.invite_code, '''')'
      when has_code then 'nullif(i.code, '''')'
      else 'null'
    end;

    invited_by_expr := case when has_invited_by then 'i.invited_by' else 'null' end;
    accepted_by_expr := case when has_accepted_by then 'i.accepted_by' else 'null' end;
    accepted_at_expr := case when has_accepted_at then 'i.accepted_at' else 'null' end;

    execute format($sql$
      insert into public.company_invitations (
        company_id,
        email,
        role,
        token,
        invite_code,
        invited_by,
        status,
        expires_at,
        accepted_by,
        accepted_at,
        created_at
      )
      select
        i.org_id,
        lower(i.email),
        case
          when lower(coalesce(i.role, 'member')) = 'admin' then 'admin'::public.company_role
          when lower(coalesce(i.role, 'member')) = 'editor' then 'manager'::public.company_role
          when lower(coalesce(i.role, 'member')) = 'viewer' then 'member'::public.company_role
          else 'member'::public.company_role
        end,
        coalesce(%s, encode(gen_random_bytes(16), 'hex')),
        coalesce(%s, upper(left(encode(gen_random_bytes(8), 'hex'), 8))),
        %s,
        case
          when lower(coalesce(i.status, 'pending')) = 'accepted' then 'accepted'
          when lower(coalesce(i.status, 'pending')) = 'expired' then 'expired'
          when lower(coalesce(i.status, 'pending')) in ('declined', 'revoked') then 'revoked'
          else 'pending'
        end,
        coalesce(i.expires_at, now() + interval '14 days'),
        %s,
        %s,
        coalesce(i.created_at, now())
      from public.org_invitations i
      join public.companies c on c.id = i.org_id
      on conflict (token) do nothing
    $sql$, token_expr, invite_code_expr, invited_by_expr, accepted_by_expr, accepted_at_expr);
  end if;
end $$;

-- Migrate site/company and visit/company links from org model
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sites'
      and column_name = 'org_id'
  ) then
    update public.sites
    set company_id = org_id
    where company_id is null and org_id is not null;
  end if;
end $$;

update public.site_visits sv
set company_id = s.company_id
from public.sites s
where sv.site_id = s.id
  and sv.company_id is null
  and s.company_id is not null;

-- Backfill profiles for existing auth users
insert into public.profiles (id, email, created_at, updated_at)
select u.id, lower(u.email), coalesce(u.created_at, now()), now()
from auth.users u
on conflict (id) do update
set email = excluded.email,
    updated_at = now();

update public.profiles p
set active_company_id = t.company_id
from (
  select distinct on (cm.user_id) cm.user_id, cm.company_id
  from public.company_memberships cm
  order by cm.user_id, cm.created_at asc
) as t
where p.id = t.user_id
  and p.active_company_id is null;

-- 6) Utility functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce((auth.jwt() ->> 'email')::text, ''));
$$;

create or replace function public.get_my_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid();
$$;

create or replace function public.has_company_role(p_company_id uuid, p_roles public.company_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.role = any(p_roles)
  );
$$;

create or replace function public.site_belongs_to_company(p_site_id uuid, p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sites s
    where s.id = p_site_id and s.company_id = p_company_id
  );
$$;

create or replace function public.create_company_with_owner(p_company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug_base text;
  v_slug text;
  v_company_id uuid;
  v_i int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_name := trim(coalesce(p_company_name, ''));
  if v_name = '' then
    raise exception 'Company name is required';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'company';
  end if;
  v_slug := v_slug_base;

  while exists (select 1 from public.companies c where c.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_slug_base || '-' || v_i::text;
  end loop;

  insert into public.companies (name, slug, owner_user_id)
  values (v_name, v_slug, auth.uid())
  returning id into v_company_id;

  insert into public.company_memberships (company_id, user_id, role)
  values (v_company_id, auth.uid(), 'owner')
  on conflict (company_id, user_id) do update set role = 'owner';

  insert into public.profiles (id, email)
  values (auth.uid(), public.current_user_email())
  on conflict (id) do nothing;

  update public.profiles
  set active_company_id = v_company_id
  where id = auth.uid();

  return v_company_id;
end;
$$;

create or replace function public.set_active_company(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    return false;
  end if;

  insert into public.profiles (id, email, active_company_id)
  values (auth.uid(), public.current_user_email(), p_company_id)
  on conflict (id) do update
    set active_company_id = excluded.active_company_id,
        updated_at = now();

  return true;
end;
$$;

create or replace function public.set_active_site(p_site_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select s.company_id into v_company_id
  from public.sites s
  where s.id = p_site_id;

  if v_company_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = v_company_id
      and cm.user_id = auth.uid()
  ) then
    return false;
  end if;

  update public.profiles
  set active_site_id = p_site_id,
      active_company_id = v_company_id,
      updated_at = now()
  where id = auth.uid();

  return true;
end;
$$;

create or replace function public.create_company_invitation(
  p_company_id uuid,
  p_email text,
  p_role public.company_role default 'member'
)
returns table (
  id uuid,
  token text,
  invite_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_token text;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_company_role(p_company_id, array['owner'::public.company_role, 'admin'::public.company_role]) then
    raise exception 'Not allowed';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' then
    raise exception 'Email is required';
  end if;

  v_token := encode(gen_random_bytes(16), 'hex');
  v_code := upper(left(encode(gen_random_bytes(8), 'hex'), 8));

  return query
  insert into public.company_invitations (
    company_id,
    email,
    role,
    token,
    invite_code,
    invited_by,
    status,
    expires_at
  )
  values (
    p_company_id,
    v_email,
    p_role,
    v_token,
    v_code,
    auth.uid(),
    'pending',
    now() + interval '14 days'
  )
  returning company_invitations.id, company_invitations.token, company_invitations.invite_code, company_invitations.expires_at;
end;
$$;

create or replace function public.accept_company_invitation(p_token_or_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.company_invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
  end if;

  v_email := public.current_user_email();
  if v_email = '' then
    return jsonb_build_object('success', false, 'message', 'Account email unavailable');
  end if;

  update public.company_invitations ci
  set status = case when ci.status = 'pending' and ci.expires_at < now() then 'expired' else ci.status end
  where ci.status = 'pending';

  select *
  into v_inv
  from public.company_invitations ci
  where ci.status = 'pending'
    and ci.expires_at > now()
    and (ci.token = trim(p_token_or_code) or ci.invite_code = upper(trim(p_token_or_code)))
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invitation not found or expired');
  end if;

  if lower(v_inv.email) <> v_email then
    return jsonb_build_object('success', false, 'message', 'Invitation email does not match your account');
  end if;

  insert into public.company_memberships (company_id, user_id, role, invited_by)
  values (v_inv.company_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (company_id, user_id) do update
    set role = excluded.role;

  update public.company_invitations
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = v_inv.id;

  insert into public.profiles (id, email, active_company_id)
  values (auth.uid(), v_email, v_inv.company_id)
  on conflict (id) do update
    set active_company_id = excluded.active_company_id,
        updated_at = now();

  return jsonb_build_object('success', true, 'company_id', v_inv.company_id::text);
end;
$$;

create or replace function public.sync_site_visit_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.site_id is null then
    return new;
  end if;

  select s.company_id into v_company_id
  from public.sites s
  where s.id = new.site_id;

  if v_company_id is null then
    raise exception 'Site is missing company assignment';
  end if;

  if new.company_id is null then
    new.company_id := v_company_id;
  elsif new.company_id <> v_company_id then
    raise exception 'Site and company mismatch on site_visits';
  end if;

  if new.created_by_user_id is null then
    new.created_by_user_id := auth.uid();
  end if;
  if new.signed_in_by_user_id is null then
    new.signed_in_by_user_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists sync_site_visit_company_trigger on public.site_visits;
create trigger sync_site_visit_company_trigger
before insert or update on public.site_visits
for each row execute function public.sync_site_visit_company();

-- Create profile row for new auth users
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- 7) Indexes
create index if not exists idx_profiles_active_company on public.profiles(active_company_id);
create index if not exists idx_profiles_active_site on public.profiles(active_site_id);
create index if not exists idx_company_memberships_user on public.company_memberships(user_id);
create index if not exists idx_company_memberships_company_role on public.company_memberships(company_id, role);
create index if not exists idx_company_invites_company_status on public.company_invitations(company_id, status);
create index if not exists idx_company_invites_email on public.company_invitations(lower(email));
create index if not exists idx_sites_company on public.sites(company_id);
create index if not exists idx_projects_company_site on public.projects(company_id, site_id);
create index if not exists idx_site_visits_company_site on public.site_visits(company_id, site_id);
create index if not exists idx_site_visits_site_signed_in on public.site_visits(site_id, signed_in_at desc);

-- 8) RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.sites enable row level security;
alter table public.site_visits enable row level security;

-- Drop all existing policies on affected tables to avoid legacy policy leakage.
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'companies',
        'profiles',
        'company_memberships',
        'company_invitations',
        'projects',
        'sites',
        'site_visits'
      )
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Profiles
create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.company_memberships mine
      join public.company_memberships peer
        on mine.company_id = peer.company_id
      where mine.user_id = auth.uid()
        and peer.user_id = profiles.id
    )
  );

create policy profiles_insert
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Companies
create policy companies_select
  on public.companies
  for select
  to authenticated
  using (id in (select public.get_my_company_ids()));

create policy companies_insert
  on public.companies
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy companies_update
  on public.companies
  for update
  to authenticated
  using (public.has_company_role(id, array['owner'::public.company_role, 'admin'::public.company_role]))
  with check (public.has_company_role(id, array['owner'::public.company_role, 'admin'::public.company_role]));

create policy companies_delete
  on public.companies
  for delete
  to authenticated
  using (public.has_company_role(id, array['owner'::public.company_role]));

-- Memberships
create policy company_memberships_select
  on public.company_memberships
  for select
  to authenticated
  using (company_id in (select public.get_my_company_ids()));

create policy company_memberships_insert
  on public.company_memberships
  for insert
  to authenticated
  with check (
    public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
    or (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from public.company_memberships cm where cm.company_id = company_memberships.company_id
      )
    )
  );

create policy company_memberships_update
  on public.company_memberships
  for update
  to authenticated
  using (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role]))
  with check (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role]));

create policy company_memberships_delete
  on public.company_memberships
  for delete
  to authenticated
  using (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role]));

-- Invitations
create policy company_invitations_select
  on public.company_invitations
  for select
  to authenticated
  using (
    public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
    or lower(email) = public.current_user_email()
  );

create policy company_invitations_insert
  on public.company_invitations
  for insert
  to authenticated
  with check (
    public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
  );

create policy company_invitations_update
  on public.company_invitations
  for update
  to authenticated
  using (
    public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
    or lower(email) = public.current_user_email()
  )
  with check (
    public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
    or lower(email) = public.current_user_email()
  );

create policy company_invitations_delete
  on public.company_invitations
  for delete
  to authenticated
  using (
    public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
  );

-- Projects
create policy projects_select
  on public.projects
  for select
  to authenticated
  using (company_id in (select public.get_my_company_ids()));

create policy projects_insert
  on public.projects
  for insert
  to authenticated
  with check (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]));

create policy projects_update
  on public.projects
  for update
  to authenticated
  using (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]))
  with check (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]));

create policy projects_delete
  on public.projects
  for delete
  to authenticated
  using (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role]));

-- Sites (anon select required for QR lookups)
create policy sites_anon_select
  on public.sites
  for select
  to anon
  using (true);

create policy sites_auth_select
  on public.sites
  for select
  to authenticated
  using (company_id in (select public.get_my_company_ids()));

create policy sites_auth_insert
  on public.sites
  for insert
  to authenticated
  with check (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]));

create policy sites_auth_update
  on public.sites
  for update
  to authenticated
  using (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]))
  with check (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]));

create policy sites_auth_delete
  on public.sites
  for delete
  to authenticated
  using (public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role]));

-- Site visits
create policy site_visits_anon_insert
  on public.site_visits
  for insert
  to anon
  with check (
    site_id is not null
  );

create policy site_visits_anon_update
  on public.site_visits
  for update
  to anon
  using (signed_out_at is null)
  with check (site_id is not null);

create policy site_visits_auth_select
  on public.site_visits
  for select
  to authenticated
  using (company_id in (select public.get_my_company_ids()));

create policy site_visits_auth_insert
  on public.site_visits
  for insert
  to authenticated
  with check (company_id in (select public.get_my_company_ids()));

create policy site_visits_auth_update
  on public.site_visits
  for update
  to authenticated
  using (company_id in (select public.get_my_company_ids()))
  with check (company_id in (select public.get_my_company_ids()));

create policy site_visits_auth_delete
  on public.site_visits
  for delete
  to authenticated
  using (company_id in (select public.get_my_company_ids()));

-- 9) Grants for app functions
grant execute on function public.get_my_company_ids() to authenticated;
grant execute on function public.has_company_role(uuid, public.company_role[]) to authenticated;
grant execute on function public.site_belongs_to_company(uuid, uuid) to authenticated, anon;
grant execute on function public.current_user_email() to authenticated;
grant execute on function public.create_company_with_owner(text) to authenticated;
grant execute on function public.set_active_company(uuid) to authenticated;
grant execute on function public.set_active_site(uuid) to authenticated;
grant execute on function public.create_company_invitation(uuid, text, public.company_role) to authenticated;
grant execute on function public.accept_company_invitation(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'company_memberships'
      and constraint_name = 'company_memberships_user_id_profiles_fkey'
  ) then
    alter table public.company_memberships
      add constraint company_memberships_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create or replace function public.set_active_site(p_site_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select s.company_id into v_company_id
  from public.sites s
  where s.id = p_site_id;

  if v_company_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = v_company_id
      and cm.user_id = auth.uid()
  ) then
    return false;
  end if;

  insert into public.profiles (id, email, active_company_id, active_site_id)
  values (auth.uid(), public.current_user_email(), v_company_id, p_site_id)
  on conflict (id) do update
    set active_company_id = excluded.active_company_id,
        active_site_id = excluded.active_site_id,
        updated_at = now();

  return true;
end;
$$;

drop policy if exists site_visits_anon_select on public.site_visits;
create policy site_visits_anon_select
  on public.site_visits
  for select
  to anon
  using (site_id is not null);
