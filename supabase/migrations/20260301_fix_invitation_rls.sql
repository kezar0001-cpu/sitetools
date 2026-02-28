-- Fix invitation visibility policy to avoid selecting auth.users directly
-- and use JWT email instead. This prevents "permission denied for table users"
-- when fetching invitations as an authenticated client.

set search_path = public;

-- Helper to get current user's email from JWT (falls back to auth.users only if available)
create or replace function public.current_user_email()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'email', ''),
    (select email from auth.users where id = auth.uid())
  );
$$;

grant execute on function public.current_user_email() to authenticated;

-- Replace invitation select policy to use JWT email instead of querying auth.users
drop policy if exists "user_select_own_invitations" on public.org_invitations;
create policy "user_select_own_invitations"
  on public.org_invitations
  for select
  using (
    public.current_user_email() = org_invitations.email
  );
