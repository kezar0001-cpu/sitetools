-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SITE LOGO URL ADDITION                                                      ║
-- ║  Add logo_url column to sites table for QR code customization                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Add logo_url column to sites table
alter table public.sites add column if not exists logo_url text;

-- Update RLS policies to include logo_url in select permissions
drop policy if exists "org_select_sites" on public.sites;
create policy "org_select_sites"
  on public.sites for select
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
    )
  );

-- Update admin policies to include logo_url in insert/update permissions
drop policy if exists "org_admin_insert_sites" on public.sites;
create policy "org_admin_insert_sites"
  on public.sites for insert
  with check (
    exists (
      select 1 from org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );

drop policy if exists "org_admin_update_sites" on public.sites;
create policy "org_admin_update_sites"
  on public.sites for update
  using (
    exists (
      select 1 from org_members
      where org_members.org_id = sites.org_id
        and org_members.user_id = auth.uid()
        and org_members.role = 'admin'
    )
  );
