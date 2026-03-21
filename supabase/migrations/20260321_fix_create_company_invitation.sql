-- Fix create_company_invitation to handle duplicate pending invites gracefully
-- and ensure pgcrypto is available for gen_random_bytes.

create extension if not exists pgcrypto with schema extensions;

-- Replace existing function with a robust version that:
-- 1. Cancels any existing pending invitation to the same email for this company
--    before inserting a fresh one (avoids unique-code collisions and silent failures).
-- 2. Raises descriptive exceptions so the client can surface the real error.
create or replace function public.create_company_invitation(
  p_company_id uuid,
  p_email      text,
  p_role       public.company_role default 'member'
)
returns table (
  id          uuid,
  token       text,
  invite_code text,
  expires_at  timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text;
  v_token text;
  v_code  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.has_company_role(
    p_company_id,
    array['owner'::public.company_role, 'admin'::public.company_role]
  ) then
    raise exception 'Not allowed: you must be an owner or admin to invite members';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' then
    raise exception 'Email is required';
  end if;

  -- Revoke any existing pending invitation for this email + company so the
  -- admin can always issue a fresh one without hitting unique constraints.
  update public.company_invitations
  set    status = 'revoked'
  where  company_id = p_company_id
    and  lower(email) = v_email
    and  status = 'pending';

  v_token := encode(gen_random_bytes(16), 'hex');
  v_code  := upper(left(encode(gen_random_bytes(8), 'hex'), 8));

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
  returning
    company_invitations.id,
    company_invitations.token,
    company_invitations.invite_code,
    company_invitations.expires_at;
end;
$$;

grant execute on function public.create_company_invitation(uuid, text, public.company_role) to authenticated;
