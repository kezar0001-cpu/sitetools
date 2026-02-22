-- Create sites table
create table if not exists public.sites (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  created_at timestamptz not null default now()
);

-- Add site_id to site_visits (nullable so existing rows aren't broken)
alter table public.site_visits
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

-- RLS for sites table
alter table public.sites enable row level security;

create policy "anon_select_sites"
  on public.sites for select to anon using (true);

create policy "anon_insert_sites"
  on public.sites for insert to anon with check (true);
