-- RPC: get_projects_with_counts(p_company_id uuid)
-- Returns all non-archived projects for a company with site_count and
-- plan_count aggregated in the database, replacing the three-query
-- client-side approach in fetchCompanyProjectsWithCounts().
--
-- Security: SECURITY DEFINER so the function runs as the owner and can
-- query the tables without RLS interference, but we verify the caller is
-- an authenticated member of the requested company before returning data.

create or replace function public.get_projects_with_counts(p_company_id uuid)
returns table (
  id            uuid,
  company_id    uuid,
  name          text,
  description   text,
  status        text,
  created_by    uuid,
  created_at    timestamptz,
  updated_at    timestamptz,
  site_count    bigint,
  plan_count    bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Verify the caller is authenticated and belongs to the requested company.
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.company_memberships
    where user_id    = auth.uid()
      and company_id = p_company_id
  ) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.company_id,
    p.name,
    p.description,
    p.status::text,
    p.created_by,
    p.created_at,
    p.updated_at,
    count(distinct s.id)  as site_count,
    count(distinct pl.id) as plan_count
  from public.projects p
  left join public.sites s
    on s.project_id = p.id
  left join public.project_plans pl
    on  pl.project_id = p.id
    and pl.status::text <> 'archived'
  where p.company_id = p_company_id
  group by p.id
  order by p.created_at desc;
end;
$$;

-- Only authenticated users may call this function.
revoke all    on function public.get_projects_with_counts(uuid) from public;
grant  execute on function public.get_projects_with_counts(uuid) to authenticated;
