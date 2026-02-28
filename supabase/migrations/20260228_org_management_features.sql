-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  ORGANIZATION MANAGEMENT FEATURES                                            ║
-- ║  Add support for org-less accounts, org deletion, join codes, and transfers    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Add join_code and join_code_expires to organisations table
alter table public.organisations add column if not exists join_code text;
alter table public.organisations add column if not exists join_code_expires timestamptz;
alter table public.organisations add column if not exists created_by uuid references auth.users(id);

-- Add org_transfer_requests table for organization ownership transfers
create table if not exists public.org_transfer_requests (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organisations(id) on delete cascade,
    from_user_id uuid not null references auth.users(id) on delete cascade,
    to_user_id uuid not null references auth.users(id) on delete cascade,
    message text,
    status text not null check (status in ('pending', 'accepted', 'declined', 'expired')),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '7 days'),
    responded_at timestamptz,
    unique(org_id, to_user_id) -- One pending request per org per user
);

-- Add org_deletion_requests table for organization deletion with approval
create table if not exists public.org_deletion_requests (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.organisations(id) on delete cascade,
    requested_by uuid not null references auth.users(id) on delete cascade,
    reason text,
    status text not null check (status in ('pending', 'approved', 'cancelled')),
    created_at timestamptz not null default now(),
    approved_at timestamptz,
    approved_by uuid references auth.users(id) -- For multi-admin approval
);

-- Helper function to generate secure join code
create or replace function generate_join_code()
returns text as $$
begin
    -- Generate a 12-character alphanumeric code
    return upper(substring(encode(gen_random_bytes(8), 'base64'), 1, 12));
end;
$$ language plpgsql volatile;

-- Function to join organization using join code
create or replace function join_by_code(p_join_code text, p_user_id uuid)
returns table(success boolean, message text) as $$
declare
    v_org_id uuid;
    v_org_name text;
    v_existing_member record;
    v_code_expires timestamptz;
begin
    -- Find organization with valid join code
    select id, name, join_code_expires into v_org_id, v_org_name, v_code_expires
    from public.organisations
    where join_code = p_join_code
      and join_code_expires > now();
    
    if not found then
        return query select false, 'Invalid or expired join code.'::text;
        return;
    end if;
    
    -- Check if user is already a member
    select * into v_existing_member
    from public.org_members
    where org_id = v_org_id and user_id = p_user_id;
    
    if found then
        return query select false, 'You are already a member of this organization.'::text;
        return;
    end if;
    
    -- Add user as viewer (default role for code join)
    insert into public.org_members (org_id, user_id, role, site_id)
    values (v_org_id, p_user_id, 'viewer', null);
    
    return query select true, ('Successfully joined ' || v_org_name || '!')::text;
    return;
end;
$$ language plpgsql security definer;

-- Function to request organization transfer
create or replace function request_org_transfer(p_org_id uuid, p_to_user_id uuid, p_message text)
returns table(success boolean, message text) as $$
declare
    v_requester_role text;
    v_target_user record;
    v_existing_request record;
begin
    -- Check if requester is admin
    select role into v_requester_role
    from public.org_members
    where org_id = p_org_id and user_id = auth.uid();
    
    if v_requester_role != 'admin' then
        return query select false, 'Only admins can request organization transfers.'::text;
        return;
    end if;
    
    -- Check if target user exists
    select id, email into v_target_user
    from auth.users
    where id = p_to_user_id;
    
    if not found then
        return query select false, 'Target user does not exist.'::text;
        return;
    end if;
    
    -- Check for existing pending request
    select * into v_existing_request
    from public.org_transfer_requests
    where org_id = p_org_id
      and to_user_id = p_to_user_id
      and status = 'pending';
    
    if found then
        return query select false, 'A transfer request to this user is already pending.'::text;
        return;
    end if;
    
    -- Create transfer request
    insert into public.org_transfer_requests (org_id, from_user_id, to_user_id, message)
    values (p_org_id, auth.uid(), p_to_user_id, p_message);
    
    return query select true, 'Transfer request sent successfully.'::text;
    return;
end;
$$ language plpgsql security definer;

-- Function to accept organization transfer
create or replace function accept_org_transfer(p_request_id uuid)
returns table(success boolean, message text) as $$
declare
    v_request record;
    v_current_admins int;
begin
    -- Get transfer request
    select * into v_request
    from public.org_transfer_requests
    where id = p_request_id
      and to_user_id = auth.uid()
      and status = 'pending'
      and expires_at > now();
    
    if not found then
        return query select false, 'Invalid or expired transfer request.'::text;
        return;
    end if;
    
    -- Check if user is already admin of the org
    select count(*) into v_current_admins
    from public.org_members
    where org_id = v_request.org_id and role = 'admin';
    
    -- Add new admin
    insert into public.org_members (org_id, user_id, role, site_id)
    values (v_request.org_id, auth.uid(), 'admin', null)
    on conflict (org_id, user_id) do update set role = 'admin';
    
    -- Update request status
    update public.org_transfer_requests
    set status = 'accepted', responded_at = now()
    where id = p_request_id;
    
    return query select true, 'Organization transfer accepted! You are now an admin.'::text;
    return;
end;
$$ language plpgsql security definer;

-- Function to request organization deletion
create or replace function request_org_deletion(p_org_id uuid, p_reason text)
returns table(success boolean, message text) as $$
declare
    v_requester_role text;
    v_member_count int;
    v_existing_request record;
begin
    -- Check if requester is admin
    select role into v_requester_role
    from public.org_members
    where org_id = p_org_id and user_id = auth.uid();
    
    if v_requester_role != 'admin' then
        return query select false, 'Only admins can request organization deletion.'::text;
        return;
    end if;
    
    -- Check member count (require approval for orgs with >1 member)
    select count(*) into v_member_count
    from public.org_members
    where org_id = p_org_id;
    
    if v_member_count > 1 then
        -- Check for existing pending request
        select * into v_existing_request
        from public.org_deletion_requests
        where org_id = p_org_id and status = 'pending';
        
        if found then
            return query select false, 'A deletion request is already pending.'::text;
            return;
        end if;
        
        -- Create deletion request for multi-admin approval
        insert into public.org_deletion_requests (org_id, requested_by, reason)
        values (p_org_id, auth.uid(), p_reason);
        
        return query select true, 'Deletion request submitted. Other admins must approve this action.'::text;
    end if;
    
    -- Single admin can delete immediately
    -- Delete all related data
    delete from public.org_members where org_id = p_org_id;
    delete from public.org_invitations where org_id = p_org_id;
    delete from public.org_join_requests where org_id = p_org_id;
    delete from public.org_transfer_requests where org_id = p_org_id;
    delete from public.org_deletion_requests where org_id = p_org_id;
    delete from public.sites where org_id = p_org_id;
    delete from public.organisations where id = p_org_id;
    
    return query select true, 'Organization deleted successfully.'::text;
end;
$$ language plpgsql security definer;

-- Function to approve organization deletion
create or replace function approve_org_deletion(p_request_id uuid)
returns table(success boolean, message text) as $$
declare
    v_request record;
    v_approver_role text;
begin
    -- Get deletion request
    select * into v_request
    from public.org_deletion_requests
    where id = p_request_id and status = 'pending';
    
    if not found then
        return query select false, 'Invalid deletion request.'::text;
        return;
    end if;
    
    -- Check if approver is admin (but not the requester)
    select role into v_approver_role
    from public.org_members
    where org_id = v_request.org_id and user_id = auth.uid();
    
    if v_approver_role != 'admin' or auth.uid() = v_request.requested_by then
        return query select false, 'Only other admins can approve deletion requests.'::text;
        return;
    end if;
    
    -- Delete all related data
    delete from public.org_members where org_id = v_request.org_id;
    delete from public.org_invitations where org_id = v_request.org_id;
    delete from public.org_join_requests where org_id = v_request.org_id;
    delete from public.org_transfer_requests where org_id = v_request.org_id;
    delete from public.org_deletion_requests where org_id = v_request.org_id;
    delete from public.sites where org_id = v_request.org_id;
    delete from public.organisations where id = v_request.org_id;
    
    return query select true, 'Organization deleted successfully.'::text;
end;
$$ language plpgsql security definer;

-- Function to generate new join code
create or replace function generate_org_join_code(p_org_id uuid, p_expires_hours int default 168) -- 7 days default
returns table(success boolean, join_code text) as $$
declare
    v_requester_role text;
    v_new_code text;
begin
    -- Check if requester is admin
    select role into v_requester_role
    from public.org_members
    where org_id = p_org_id and user_id = auth.uid();
    
    if v_requester_role != 'admin' then
        return query select false, null::text;
        return;
    end if;
    
    -- Generate new code
    v_new_code := generate_join_code();
    
    -- Update organization
    update public.organisations
    set join_code = v_new_code,
        join_code_expires = now() + (p_expires_hours || ' hours')::interval
    where id = p_org_id;
    
    return query select true, v_new_code;
    return;
end;
$$ language plpgsql security definer;

-- RLS Policies for new tables

-- org_transfer_requests
do $$
begin
    if not exists (
        select 1 from pg_tables 
        where tablename = 'org_transfer_requests' 
        and rowsecurity = true
    ) then
        alter table public.org_transfer_requests enable row level security;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_transfer_requests' 
        and policyname = 'Users can view their own transfer requests'
    ) then
        create policy "Users can view their own transfer requests"
          on public.org_transfer_requests for select
          using (
            from_user_id = auth.uid() or
            to_user_id = auth.uid() or
            exists (
              select 1 from org_members
              where org_members.org_id = org_transfer_requests.org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_transfer_requests' 
        and policyname = 'Admins can create transfer requests'
    ) then
        create policy "Admins can create transfer requests"
          on public.org_transfer_requests for insert
          with check (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_transfer_requests' 
        and policyname = 'Target users can update transfer requests'
    ) then
        create policy "Target users can update transfer requests"
          on public.org_transfer_requests for update
          using (to_user_id = auth.uid())
          with check (to_user_id = auth.uid());
    end if;
end $$;

-- org_deletion_requests
do $$
begin
    if not exists (
        select 1 from pg_tables 
        where tablename = 'org_deletion_requests' 
        and rowsecurity = true
    ) then
        alter table public.org_deletion_requests enable row level security;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_deletion_requests' 
        and policyname = 'Org admins can view deletion requests'
    ) then
        create policy "Org admins can view deletion requests"
          on public.org_deletion_requests for select
          using (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_deletion_requests' 
        and policyname = 'Org admins can create deletion requests'
    ) then
        create policy "Org admins can create deletion requests"
          on public.org_deletion_requests for insert
          with check (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'org_deletion_requests' 
        and policyname = 'Org admins can approve deletion requests'
    ) then
        create policy "Org admins can approve deletion requests"
          on public.org_deletion_requests for update
          using (
            exists (
              select 1 from org_members
              where org_members.org_id = org_id
                and org_members.user_id = auth.uid()
                and org_members.role = 'admin'
            )
          );
    end if;
end $$;

-- Function to get user by email (for admin use)
create or replace function get_user_by_email(p_email text)
returns table(id uuid, email text, created_at timestamptz) as $$
begin
    return query
    select u.id, u.email, u.created_at
    from auth.users u
    where u.email = lower(p_email)
    limit 1;
end;
$$ language plpgsql security definer;

-- Function to get user by ID (for admin use)
create or replace function get_user_by_id(p_user_id uuid)
returns table(id uuid, email text, created_at timestamptz) as $$
begin
    return query
    select u.id, u.email, u.created_at
    from auth.users u
    where u.id = p_user_id
    limit 1;
end;
$$ language plpgsql security definer;

-- Grant access to authenticated users
grant execute on function get_user_by_email(text) to authenticated;
grant execute on function get_user_by_id(uuid) to authenticated;

-- Update existing organisations table RLS to include join_code
drop policy if exists "org_select_organisations" on public.organisations;
create policy "org_select_organisations"
  on public.organisations for select
  using (
    is_public = true or
    exists (
      select 1 from org_members
      where org_members.org_id = organisations.id
        and org_members.user_id = auth.uid()
    )
  );
