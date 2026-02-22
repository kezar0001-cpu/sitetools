-- Create site_visits table
create table if not exists public.site_visits (
  id             uuid        primary key default gen_random_uuid(),
  full_name      text        not null,
  company_name   text        not null,
  visitor_type   text        not null check (visitor_type in ('Worker', 'Subcontractor', 'Visitor', 'Delivery')),
  signed_in_at   timestamptz not null default now(),
  signed_out_at  timestamptz
);

-- Enable Row Level Security
alter table public.site_visits enable row level security;

-- Policy: allow anonymous inserts
create policy "anon_insert"
  on public.site_visits
  for insert
  to anon
  with check (true);

-- Policy: allow anonymous reads
create policy "anon_select"
  on public.site_visits
  for select
  to anon
  using (true);
