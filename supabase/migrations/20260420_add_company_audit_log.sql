-- =============================================================
-- Company-wide audit log for profile/company/membership changes
-- =============================================================

-- ─────────────────────────────────────────────
-- Table: company_audit_log
-- ─────────────────────────────────────────────
create table if not exists public.company_audit_log (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  entity_type           text not null
                          check (entity_type in ('profile', 'company', 'membership', 'site', 'project', 'invitation')),
  entity_id             uuid not null,
  action                text not null
                          check (action in ('create', 'update', 'delete', 'invite', 'accept', 'revoke')),
  performed_by_user_id  uuid references auth.users(id) on delete set null,
  performed_at          timestamptz not null default now(),
  changes               jsonb not null default '[]'::jsonb,
  metadata              jsonb not null default '{}'::jsonb
);

-- Indexes for efficient querying
comment on table public.company_audit_log is 'Audit trail for company-level changes';

-- Index for company-scoped queries (most common)
create index if not exists idx_company_audit_log_company_id
  on public.company_audit_log(company_id, performed_at desc);

-- Index for entity lookups
create index if not exists idx_company_audit_log_entity
  on public.company_audit_log(entity_type, entity_id, performed_at desc);

-- Index for user activity lookups
create index if not exists idx_company_audit_log_performed_by
  on public.company_audit_log(performed_by_user_id, performed_at desc);

-- Enable RLS
alter table public.company_audit_log enable row level security;

-- Policy: Company members can view audit logs for their company
create policy company_audit_log_select on public.company_audit_log
  for select to authenticated
  using (company_id in (select public.get_my_company_ids()));

-- Policy: Company members can insert audit log entries
create policy company_audit_log_insert on public.company_audit_log
  for insert to authenticated
  with check (company_id in (select public.get_my_company_ids()));

-- ─────────────────────────────────────────────
-- Function: auto-log profile updates
-- ─────────────────────────────────────────────
create or replace function public.log_profile_update()
returns trigger as $$
begin
  -- Only log if there's a meaningful change
  if old.full_name is distinct from new.full_name or
     old.phone_number is distinct from new.phone_number then
    insert into public.company_audit_log (
      company_id,
      entity_type,
      entity_id,
      action,
      performed_by_user_id,
      changes,
      metadata
    )
    select
      cm.company_id,
      'profile',
      new.id,
      'update',
      new.id, -- Self-performed
      jsonb_build_array(
        jsonb_build_object(
          'field', 'full_name',
          'old_value', old.full_name,
          'new_value', new.full_name
        ),
        jsonb_build_object(
          'field', 'phone_number',
          'old_value', old.phone_number,
          'new_value', new.phone_number
        )
      ) filter (where old.full_name is distinct from new.full_name or old.phone_number is distinct from new.phone_number),
      jsonb_build_object(
        'updated_at', new.updated_at
      )
    from public.company_memberships cm
    where cm.user_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for profile updates
-- Note: This will log profile updates across all companies the user belongs to
drop trigger if exists trg_log_profile_update on public.profiles;
create trigger trg_log_profile_update
  after update on public.profiles
  for each row
  execute function public.log_profile_update();

-- ─────────────────────────────────────────────
-- Function: auto-log membership changes
-- ─────────────────────────────────────────────
create or replace function public.log_membership_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.company_audit_log (
      company_id,
      entity_type,
      entity_id,
      action,
      performed_by_user_id,
      changes,
      metadata
    )
    values (
      new.company_id,
      'membership',
      new.id,
      'create',
      coalesce(new.invited_by, new.user_id),
      jsonb_build_array(
        jsonb_build_object(
          'field', 'role',
          'old_value', null,
          'new_value', new.role
        )
      ),
      jsonb_build_object(
        'user_id', new.user_id,
        'role', new.role
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if old.role is distinct from new.role then
      insert into public.company_audit_log (
        company_id,
        entity_type,
        entity_id,
        action,
        performed_by_user_id,
        changes,
        metadata
      )
      values (
        new.company_id,
        'membership',
        new.id,
        'update',
        new.user_id,
        jsonb_build_array(
          jsonb_build_object(
            'field', 'role',
            'old_value', old.role,
            'new_value', new.role
          )
        ),
        jsonb_build_object(
          'user_id', new.user_id,
          'role', new.role
        )
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.company_audit_log (
      company_id,
      entity_type,
      entity_id,
      action,
      performed_by_user_id,
      changes,
      metadata
    )
    values (
      old.company_id,
      'membership',
      old.id,
      'delete',
      null,
      jsonb_build_array(
        jsonb_build_object(
          'field', 'role',
          'old_value', old.role,
          'new_value', null
        )
      ),
      jsonb_build_object(
        'user_id', old.user_id,
        'role', old.role
      )
    );
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger for membership changes
drop trigger if exists trg_log_membership_change on public.company_memberships;
create trigger trg_log_membership_change
  after insert or update or delete on public.company_memberships
  for each row
  execute function public.log_membership_change();

-- ─────────────────────────────────────────────
-- Function: auto-log invitation changes
-- ─────────────────────────────────────────────
create or replace function public.log_invitation_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.company_audit_log (
      company_id,
      entity_type,
      entity_id,
      action,
      performed_by_user_id,
      changes,
      metadata
    )
    values (
      new.company_id,
      'invitation',
      new.id,
      'invite',
      new.invited_by,
      jsonb_build_array(
        jsonb_build_object(
          'field', 'status',
          'old_value', null,
          'new_value', new.status
        )
      ),
      jsonb_build_object(
        'email', new.email,
        'role', new.role,
        'invite_code', new.invite_code
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status is distinct from new.status and new.status = 'accepted' then
      insert into public.company_audit_log (
        company_id,
        entity_type,
        entity_id,
        action,
        performed_by_user_id,
        changes,
        metadata
      )
      values (
        new.company_id,
        'invitation',
        new.id,
        'accept',
        new.accepted_by,
        jsonb_build_array(
          jsonb_build_object(
            'field', 'status',
            'old_value', old.status,
            'new_value', new.status
          )
        ),
        jsonb_build_object(
          'email', new.email,
          'role', new.role,
          'accepted_at', new.accepted_at
        )
      );
    end if;
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger for invitation changes
drop trigger if exists trg_log_invitation_change on public.company_invitations;
create trigger trg_log_invitation_change
  after insert or update on public.company_invitations
  for each row
  execute function public.log_invitation_change();
