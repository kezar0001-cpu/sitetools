-- Add owner column to sites so each site belongs to the user who created it
alter table public.sites
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Drop the open anon insert policy and replace with auth-only policies
drop policy if exists "anon_insert_sites" on public.sites;
drop policy if exists "anon_select_sites" on public.sites;

-- Authenticated users can insert their own sites
create policy "auth_insert_sites"
  on public.sites for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only select their own sites
create policy "auth_select_sites"
  on public.sites for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can update their own sites
create policy "auth_update_sites"
  on public.sites for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own sites
create policy "auth_delete_sites"
  on public.sites for delete
  to authenticated
  using (auth.uid() = user_id);

-- site_visits: anon can still read/insert/update/delete (public sign-in kiosks)
-- but also allow authenticated users full access for admin operations
-- (existing anon policies on site_visits remain unchanged)
