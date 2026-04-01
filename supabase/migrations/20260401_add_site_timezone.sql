-- Add timezone support to sites table
-- This allows proper date filtering based on the site's local timezone

alter table public.sites add column if not exists timezone text default 'Australia/Sydney';

-- Add comment explaining the column
comment on column public.sites.timezone is 'IANA timezone identifier (e.g., Australia/Sydney, Australia/Melbourne) for local time calculations';

-- Create index for timezone lookups if needed
create index if not exists idx_sites_timezone on public.sites(timezone);
