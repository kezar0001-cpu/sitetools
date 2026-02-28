-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EDITORS: MULTIPLE ASSIGNED SITES                                          ║
-- ║  Editors can be assigned to more than one site via org_member_sites         ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── STEP 1: Create join table for editor site assignments ───────────────────

create table if not exists public.org_member_sites (
  id            uuid        primary key default gen_random_uuid(),
  org_member_id uuid        not null references public.org_members(id) on delete cascade,
  site_id       uuid        not null references public.sites(id) on delete cascade,
  unique(org_member_id, site_id)
);

alter table public.org_member_sites enable row level security;

-- Only org admins (and the system) can manage assignments; members can read their own
create policy "org_member_sites_select"
  on public.org_member_sites for select to authenticated
  using (
    org_member_id in (
      select id from public.org_members where org_id in (select public.get_my_org_ids())
    )
  );

create policy "org_member_sites_insert"
  on public.org_member_sites for insert to authenticated
  with check (
    public.is_org_admin((select org_id from public.org_members where id = org_member_id))
  );

create policy "org_member_sites_delete"
  on public.org_member_sites for delete to authenticated
  using (
    public.is_org_admin((select org_id from public.org_members where id = org_member_id))
  );

grant select, insert, delete on public.org_member_sites to authenticated;

-- ─── STEP 2: Backfill from current org_members.site_id ───────────────────────

insert into public.org_member_sites (org_member_id, site_id)
select id, site_id from public.org_members
where role = 'editor' and site_id is not null
on conflict (org_member_id, site_id) do nothing;

-- ─── STEP 3: Helper — sites the current user can see in this org ──────────────

create or replace function public.get_my_site_ids(p_org_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  -- Admins see all org sites
  if public.is_org_admin(p_org_id) then
    return query select id from public.sites where org_id = p_org_id;
    return;
  end if;
  -- Viewers see all org sites (read-only)
  if exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and role = 'viewer'
  ) then
    return query select id from public.sites where org_id = p_org_id;
    return;
  end if;
  -- Editors see only their assigned sites (from org_member_sites)
  return query
    select oms.site_id from public.org_member_sites oms
    inner join public.org_members m on m.id = oms.org_member_id
    where m.org_id = p_org_id and m.user_id = auth.uid();
end;
$$;

grant execute on function public.get_my_site_ids(uuid) to authenticated;

-- ─── STEP 4: Update sites RLS to use get_my_site_ids ─────────────────────────

drop policy if exists "auth_select_sites" on public.sites;

create policy "auth_select_sites"
  on public.sites for select to authenticated
  using (
    org_id in (select public.get_my_org_ids())
    and id in (select public.get_my_site_ids(org_id))
  );

-- ─── STEP 5: Update accept_invitation to add editor site to org_member_sites ─

create or replace function public.accept_invitation(invitation_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_member_id uuid;
  v_result json;
begin
  select * into v_invitation
  from org_invitations
  where id = invitation_id
    and status = 'pending'
    and expires_at > now();
  
  if not found then
    return json_build_object('success', false, 'error', 'Invitation not found or expired');
  end if;
  
  if not exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
      and auth.users.email = v_invitation.email
  ) then
    return json_build_object('success', false, 'error', 'Email does not match invitation');
  end if;
  
  if exists (
    select 1 from org_members
    where org_id = v_invitation.org_id
      and user_id = auth.uid()
  ) then
    update org_invitations set status = 'accepted' where id = invitation_id;
    return json_build_object('success', false, 'error', 'Already a member of this organization');
  end if;
  
  v_member_id := gen_random_uuid();
  insert into org_members (id, org_id, user_id, role, site_id)
  values (
    v_member_id,
    v_invitation.org_id,
    auth.uid(),
    v_invitation.role,
    case when v_invitation.role = 'editor' then v_invitation.site_id else null end
  );
  
  if v_invitation.role = 'editor' and v_invitation.site_id is not null then
    insert into org_member_sites (org_member_id, site_id)
    values (v_member_id, v_invitation.site_id);
  end if;
  
  update org_invitations set status = 'accepted' where id = invitation_id;
  
  return json_build_object(
    'success', true,
    'member_id', v_member_id,
    'org_id', v_invitation.org_id
  );
end;
$$;

-- ─── STEP 6: Update approve_join_request to add editor site to org_member_sites ─

create or replace function public.approve_join_request(
  request_id uuid,
  assign_role text,
  assign_site_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_member_id uuid;
begin
  select * into v_request
  from org_join_requests
  where id = request_id
    and status = 'pending';
  
  if not found then
    return json_build_object('success', false, 'error', 'Request not found or already processed');
  end if;
  
  if not exists (
    select 1 from org_members
    where org_id = v_request.org_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    return json_build_object('success', false, 'error', 'Unauthorized');
  end if;
  
  if assign_role not in ('admin', 'editor', 'viewer') then
    return json_build_object('success', false, 'error', 'Invalid role');
  end if;
  
  if exists (
    select 1 from org_members
    where org_id = v_request.org_id
      and user_id = v_request.user_id
  ) then
    update org_join_requests
    set status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = request_id;
    return json_build_object('success', false, 'error', 'User is already a member');
  end if;
  
  v_member_id := gen_random_uuid();
  insert into org_members (id, org_id, user_id, role, site_id)
  values (
    v_member_id,
    v_request.org_id,
    v_request.user_id,
    assign_role,
    case when assign_role = 'editor' then assign_site_id else null end
  );
  
  if assign_role = 'editor' and assign_site_id is not null then
    insert into org_member_sites (org_member_id, site_id)
    values (v_member_id, assign_site_id);
  end if;
  
  update org_join_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = request_id;
  
  return json_build_object(
    'success', true,
    'member_id', v_member_id
  );
end;
$$;
