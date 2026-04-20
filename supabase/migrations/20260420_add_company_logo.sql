-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  COMPANY LOGO                                                              ║
-- ║  Adds optional logo URL to companies (for branding)                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

alter table public.companies
  add column if not exists logo_url text;

-- Update RLS policies to include logo_url in select permissions
-- First drop existing policies that might select from companies
drop policy if exists "select_companies" on public.companies;
drop policy if exists "insert_companies" on public.companies;
drop policy if exists "update_companies" on public.companies;
drop policy if exists "delete_companies" on public.companies;

-- Create policy for selecting companies (members can see their companies)
create policy "select_companies"
  on public.companies for select
  using (
    exists (
      select 1 from public.company_memberships
      where company_memberships.company_id = companies.id
        and company_memberships.user_id = auth.uid()
    )
    or
    owner_user_id = auth.uid()
  );

-- Create policy for inserting companies (any authenticated user)
create policy "insert_companies"
  on public.companies for insert
  with check (
    owner_user_id = auth.uid()
  );

-- Create policy for updating companies (owner or admin can update)
create policy "update_companies"
  on public.companies for update
  using (
    exists (
      select 1 from public.company_memberships
      where company_memberships.company_id = companies.id
        and company_memberships.user_id = auth.uid()
        and company_memberships.role in ('owner', 'admin')
    )
    or
    owner_user_id = auth.uid()
  );

-- Create policy for deleting companies (owner only)
create policy "delete_companies"
  on public.companies for delete
  using (
    owner_user_id = auth.uid()
    or
    exists (
      select 1 from public.company_memberships
      where company_memberships.company_id = companies.id
        and company_memberships.user_id = auth.uid()
        and company_memberships.role = 'owner'
    )
  );
