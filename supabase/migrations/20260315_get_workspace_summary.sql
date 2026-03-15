-- Eliminate N+1 workspace load
--
-- Replaces three or more sequential round-trips in loadWorkspaceSummary()
-- (ensureProfile, memberships+companies join, profile re-fetch, conditional
-- set_active_company + profile re-fetch) with a single SECURITY DEFINER
-- function that does everything in one server-side transaction:
--
--   1. Upserts the caller's profile row (idempotent, mirrors ensureProfile).
--   2. Joins company_memberships → companies in one aggregation.
--   3. Auto-corrects active_company_id when it is NULL or points to a company
--      the user no longer belongs to (removes the conditional extra round-trip).
--   4. Returns a single JSONB object with { profile, memberships }.
--
-- The function uses auth.uid() internally so it is scoped to the calling user
-- and cannot be used to read another user's workspace data.

create or replace function public.get_workspace_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid             uuid := auth.uid();
  v_profile         public.profiles%rowtype;
  v_memberships     jsonb;
  v_first_cid       uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- 1. Ensure profile row exists (upsert from auth.users, idempotent).
  insert into public.profiles (id, email)
  select v_uid, lower(u.email)
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  -- 2. Load profile.
  select * into v_profile
  from public.profiles
  where id = v_uid;

  -- 3. Build membership list with embedded company data.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',         cm.id,
        'company_id', cm.company_id,
        'user_id',    cm.user_id,
        'role',       cm.role::text,
        'invited_by', cm.invited_by,
        'created_at', cm.created_at,
        'companies',  jsonb_build_object(
          'id',            c.id,
          'name',          c.name,
          'slug',          c.slug,
          'owner_user_id', c.owner_user_id,
          'created_at',    c.created_at,
          'updated_at',    c.updated_at
        )
      )
      order by cm.created_at asc
    ),
    '[]'::jsonb
  ) into v_memberships
  from public.company_memberships cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = v_uid;

  -- 4. Auto-correct active_company_id when it is missing or stale.
  --    This removes the conditional set_active_company + re-fetch round-trip
  --    that the old client code had to make after loading memberships.
  if jsonb_array_length(v_memberships) > 0
     and (
       v_profile.active_company_id is null
       or not exists (
         select 1
         from public.company_memberships
         where user_id    = v_uid
           and company_id = v_profile.active_company_id
       )
     )
  then
    -- Pick the oldest membership as the default active company.
    select (elem->>'company_id')::uuid
    into   v_first_cid
    from   jsonb_array_elements(v_memberships) as elem
    limit  1;

    update public.profiles
    set    active_company_id = v_first_cid,
           updated_at        = now()
    where  id = v_uid;

    v_profile.active_company_id := v_first_cid;
    v_profile.updated_at        := now();
  end if;

  return jsonb_build_object(
    'profile',     to_jsonb(v_profile),
    'memberships', v_memberships
  );
end;
$$;

-- Only authenticated users may call this function.
-- SECURITY DEFINER means it runs as the function owner, but the logic above
-- hard-codes auth.uid() so callers cannot read another user's data.
revoke all    on function public.get_workspace_summary() from public;
grant  execute on function public.get_workspace_summary() to authenticated;
