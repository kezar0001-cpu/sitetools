-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  ORGANIZATION INVITATIONS & JOIN REQUESTS                                  ║
-- ║  Enables multi-user organization management with approval workflows        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── STEP 1: Create new tables ───────────────────────────────────────────────

-- Organization invitations (admin invites someone to join)
create table if not exists public.org_invitations (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references public.organisations(id) on delete cascade,
  email         text        not null,
  role          text        not null check (role in ('admin', 'editor', 'viewer')),
  site_id       uuid        references public.sites(id) on delete set null,
  invited_by    uuid        not null references auth.users(id) on delete cascade,
  status        text        not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  unique(org_id, email, status)
);

-- Organization join requests (user requests to join an org)
create table if not exists public.org_join_requests (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references public.organisations(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  message       text,
  status        text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  reviewed_by   uuid        references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  unique(org_id, user_id, status)
);

-- ─── STEP 2: Enable RLS ──────────────────────────────────────────────────────

alter table public.org_invitations enable row level security;
alter table public.org_join_requests enable row level security;

-- ─── STEP 3: Grant table-level access ────────────────────────────────────────

grant select, insert, update, delete on public.org_invitations to authenticated;
grant select, insert, update, delete on public.org_join_requests to authenticated;

-- ─── STEP 4: Create helper functions ─────────────────────────────────────────

-- Check if user's email matches an invitation
create or replace function public.email_matches_invitation(invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_user_email text;
begin
  -- Get invitation email
  select email into v_email
  from org_invitations
  where id = invitation_id;
  
  -- Get current user's email
  select email into v_user_email
  from auth.users
  where id = auth.uid();
  
  return v_email = v_user_email;
end;
$$;

grant execute on function public.email_matches_invitation(uuid) to authenticated;

-- ─── STEP 5: RLS Policies for org_invitations ────────────────────────────────

-- Admins can view all invitations for their org
create policy "org_admin_select_invitations"
  on public.org_invitations for select
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = org_invitations.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Users can view invitations sent to their email
create policy "user_select_own_invitations"
  on public.org_invitations for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.email = org_invitations.email
    )
  );

-- Admins can create invitations for their org
create policy "org_admin_insert_invitations"
  on public.org_invitations for insert
  with check (
    exists (
      select 1 from org_members
      where org_members.org_id = org_invitations.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Admins can update invitations for their org
create policy "org_admin_update_invitations"
  on public.org_invitations for update
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = org_invitations.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Users can update their own invitations (to accept/decline)
create policy "user_update_own_invitations"
  on public.org_invitations for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.email = org_invitations.email
        and org_invitations.status = 'pending'
    )
  );

-- Admins can delete invitations for their org
create policy "org_admin_delete_invitations"
  on public.org_invitations for delete
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = org_invitations.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- ─── STEP 6: RLS Policies for org_join_requests ──────────────────────────────

-- Admins can view all join requests for their org
create policy "org_admin_select_join_requests"
  on public.org_join_requests for select
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = org_join_requests.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Users can view their own join requests
create policy "user_select_own_join_requests"
  on public.org_join_requests for select
  using (user_id = auth.uid());

-- Authenticated users can create join requests
create policy "authenticated_insert_join_requests"
  on public.org_join_requests for insert
  with check (user_id = auth.uid());

-- Admins can update join requests for their org (to approve/reject)
create policy "org_admin_update_join_requests"
  on public.org_join_requests for update
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = org_join_requests.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

-- Users can delete their own pending join requests
create policy "user_delete_own_join_requests"
  on public.org_join_requests for delete
  using (user_id = auth.uid() and status = 'pending');

-- ─── STEP 7: Add index for performance ───────────────────────────────────────

create index if not exists idx_org_invitations_email on public.org_invitations(email);
create index if not exists idx_org_invitations_org_status on public.org_invitations(org_id, status);
create index if not exists idx_org_join_requests_org_status on public.org_join_requests(org_id, status);
create index if not exists idx_org_join_requests_user on public.org_join_requests(user_id);

-- ─── STEP 8: Add organizations table enhancement ──────────────────────────────

-- Make organizations publicly discoverable (for join requests)
alter table public.organisations add column if not exists is_public boolean not null default false;
alter table public.organisations add column if not exists description text;

-- Allow anyone to view public organizations
drop policy if exists "public_select_orgs" on public.organisations;
create policy "public_select_orgs"
  on public.organisations for select
  using (is_public = true);

-- ─── STEP 9: Create function to accept invitation ─────────────────────────────

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
  -- Get invitation details
  select * into v_invitation
  from org_invitations
  where id = invitation_id
    and status = 'pending'
    and expires_at > now();
  
  if not found then
    return json_build_object('success', false, 'error', 'Invitation not found or expired');
  end if;
  
  -- Verify email matches
  if not exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
      and auth.users.email = v_invitation.email
  ) then
    return json_build_object('success', false, 'error', 'Email does not match invitation');
  end if;
  
  -- Check if already a member
  if exists (
    select 1 from org_members
    where org_id = v_invitation.org_id
      and user_id = auth.uid()
  ) then
    -- Update invitation status
    update org_invitations
    set status = 'accepted'
    where id = invitation_id;
    
    return json_build_object('success', false, 'error', 'Already a member of this organization');
  end if;
  
  -- Create membership
  v_member_id := gen_random_uuid();
  insert into org_members (id, org_id, user_id, role, site_id)
  values (
    v_member_id,
    v_invitation.org_id,
    auth.uid(),
    v_invitation.role,
    case when v_invitation.role = 'editor' then v_invitation.site_id else null end
  );
  
  -- Update invitation status
  update org_invitations
  set status = 'accepted'
  where id = invitation_id;
  
  return json_build_object(
    'success', true,
    'member_id', v_member_id,
    'org_id', v_invitation.org_id
  );
end;
$$;

grant execute on function public.accept_invitation(uuid) to authenticated;

-- ─── STEP 10: Create function to approve join request ─────────────────────────

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
  -- Get request details
  select * into v_request
  from org_join_requests
  where id = request_id
    and status = 'pending';
  
  if not found then
    return json_build_object('success', false, 'error', 'Request not found or already processed');
  end if;
  
  -- Verify caller is admin
  if not exists (
    select 1 from org_members
    where org_id = v_request.org_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    return json_build_object('success', false, 'error', 'Unauthorized');
  end if;
  
  -- Validate role
  if assign_role not in ('admin', 'editor', 'viewer') then
    return json_build_object('success', false, 'error', 'Invalid role');
  end if;
  
  -- Check if already a member
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
  
  -- Create membership
  v_member_id := gen_random_uuid();
  insert into org_members (id, org_id, user_id, role, site_id)
  values (
    v_member_id,
    v_request.org_id,
    v_request.user_id,
    assign_role,
    case when assign_role = 'editor' then assign_site_id else null end
  );
  
  -- Update request status
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

grant execute on function public.approve_join_request(uuid, text, uuid) to authenticated;
