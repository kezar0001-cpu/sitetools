with open('supabase/migrations/RESET_AND_FIX.sql', 'r', encoding='utf-8') as f:
    orig = f.read()

# Replace role check constraint
orig = orig.replace(
    "role       text        not null check (role in ('admin', 'editor')),",
    "role       text        not null check (role in ('admin', 'editor', 'viewer')),"
)

# Insert new tables after org_members
tables_sql = '''
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
'''
orig = orig.replace('-- Add signature column', tables_sql + '\n\n-- Add signature column')

fk_sql = '''
-- Foreign keys for new tables
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_invitations'
      and constraint_name = 'org_invitations_org_id_fkey'
  ) then
    alter table public.org_invitations
      add constraint org_invitations_org_id_fkey
      foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_join_requests'
      and constraint_name = 'org_join_requests_org_id_fkey'
  ) then
    alter table public.org_join_requests
      add constraint org_join_requests_org_id_fkey
      foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_join_requests'
      and constraint_name = 'org_join_requests_user_id_fkey'
  ) then
    alter table public.org_join_requests
      add constraint org_join_requests_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_member_sites'
      and constraint_name = 'org_member_sites_org_member_id_fkey'
  ) then
    alter table public.org_member_sites
      add constraint org_member_sites_org_member_id_fkey
      foreign key (org_member_id) references public.org_members(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'org_member_sites'
      and constraint_name = 'org_member_sites_site_id_fkey'
  ) then
    alter table public.org_member_sites
      add constraint org_member_sites_site_id_fkey
      foreign key (site_id) references public.sites(id) on delete cascade;
  end if;
end $$;

alter table public.organisations add column if not exists join_code text;
alter table public.organisations add column if not exists join_code_expires timestamptz;
'''

orig = orig.replace('-- ─── STEP 3: Enable RLS', fk_sql + '\n\n-- ─── STEP 3: Enable RLS')

rls_sql = '''
alter table public.org_invitations enable row level security;
alter table public.org_join_requests enable row level security;
alter table public.org_member_sites enable row level security;
'''
orig = orig.replace('alter table public.site_visits   enable row level security;',
                    'alter table public.site_visits   enable row level security;\n' + rls_sql)

grant_sql = '''
grant select, insert, update, delete on public.org_invitations to authenticated;
grant select, insert, update, delete on public.org_join_requests to authenticated;
grant select, insert, update, delete on public.org_member_sites to authenticated;

grant execute on function public.generate_org_join_code(uuid, int) to authenticated;
grant execute on function public.get_user_by_email(text) to authenticated;
grant execute on function public.get_user_by_id(uuid) to authenticated;
grant execute on function public.approve_join_request(uuid, text, uuid) to authenticated;
'''
orig = orig.replace('grant execute on function public.get_my_site_id(uuid)      to authenticated;',
                    'grant execute on function public.get_my_site_id(uuid)      to authenticated;\n' + grant_sql)

drop_policy_sql = '''
-- org_invitations
drop policy if exists "org_admin_invitations" on public.org_invitations;

-- org_join_requests
drop policy if exists "org_admin_join_requests_select" on public.org_join_requests;
drop policy if exists "org_admin_join_requests_update" on public.org_join_requests;
drop policy if exists "auth_join_requests_insert" on public.org_join_requests;
drop policy if exists "auth_join_requests_select" on public.org_join_requests;

-- org_member_sites
drop policy if exists "org_members_sites_select" on public.org_member_sites;
drop policy if exists "org_admin_member_sites_all" on public.org_member_sites;
'''
orig = orig.replace('-- ─── STEP 5: Create SECURITY DEFINER', drop_policy_sql + '\n\n-- ─── STEP 5: Create SECURITY DEFINER')

rpc_sql = '''
create or replace function public.generate_org_join_code(p_org_id uuid, p_expires_hours int default 168)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_code text;
begin
  if not public.is_org_admin(p_org_id) then
    return json_build_object('success', false, 'message', 'Not authorized');
  end if;

  v_code := upper(substring(md5(random()::text) from 1 for 12));
  update public.organisations
  set join_code = v_code,
      join_code_expires = now() + (p_expires_hours || ' hours')::interval
  where id = p_org_id;

  return json_build_object('success', true, 'join_code', v_code);
end;
$$;

create or replace function public.get_user_by_email(p_email text)
returns table(id uuid, email text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return query
    select u.id, u.email::text from auth.users u where u.email = p_email;
end;
$$;

create or replace function public.get_user_by_id(p_user_id uuid)
returns table(id uuid, email text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return query
    select u.id, u.email::text from auth.users u where u.id = p_user_id;
end;
$$;

create or replace function public.approve_join_request(p_request_id uuid, p_role text, p_site_id uuid default null)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_request public.org_join_requests%rowtype;
begin
  select * into v_request from public.org_join_requests where id = p_request_id;
  if not found then
    return json_build_object('success', false, 'message', 'Request not found');
  end if;

  if not public.is_org_admin(v_request.org_id) then
    return json_build_object('success', false, 'message', 'Not authorized');
  end if;

  update public.org_join_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  insert into public.org_members (org_id, user_id, role, site_id)
  values (v_request.org_id, v_request.user_id, p_role, p_site_id)
  on conflict (org_id, user_id) do update set role = excluded.role, site_id = excluded.site_id;

  return json_build_object('success', true, 'message', 'Request approved');
end;
$$;
'''
orig = orig.replace('-- ─── STEP 6: Create all RLS policies', rpc_sql + '\n\n-- ─── STEP 6: Create all RLS policies')

# Fix auth_select_visits leak
auth_visits_old = '''create policy "auth_select_visits"
  on public.site_visits for select to authenticated
  using (true);'''
auth_visits_new = '''create policy "auth_select_visits"
  on public.site_visits for select to authenticated
  using (
    site_id in (
      select id from public.sites
      where org_id in (select public.get_my_org_ids())
    )
  );'''
orig = orig.replace(auth_visits_old, auth_visits_new)

# Add new policies
new_policies_sql = '''
-- org_invitations: only org admins can do everything
create policy "org_admin_invitations"
  on public.org_invitations for all to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- org_join_requests: admins see requests for their org, users see their own
create policy "org_admin_join_requests_select"
  on public.org_join_requests for select to authenticated
  using (public.is_org_admin(org_id) or user_id = auth.uid());

create policy "org_admin_join_requests_update"
  on public.org_join_requests for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy "auth_join_requests_insert"
  on public.org_join_requests for insert to authenticated
  with check (user_id = auth.uid());

-- org_member_sites: editors and admins can see assignments for their orgs
create policy "org_members_sites_select"
  on public.org_member_sites for select to authenticated
  using (
    org_member_id in (
      select id from public.org_members where org_id in (select public.get_my_org_ids())
    )
  );

create policy "org_admin_member_sites_all"
  on public.org_member_sites for all to authenticated
  using (
    org_member_id in (
      select id from public.org_members where org_id in (
        select org_id from public.org_members where user_id = auth.uid() and role = 'admin'
      )
    )
  )
  with check (
    org_member_id in (
      select id from public.org_members where org_id in (
        select org_id from public.org_members where user_id = auth.uid() and role = 'admin'
      )
    )
  );
'''
orig = orig.replace('-- ─── DONE', new_policies_sql + '\n\n-- ─── DONE')

with open('supabase/migrations/RESET_AND_FIX.sql', 'w', encoding='utf-8') as f:
    f.write(orig)
