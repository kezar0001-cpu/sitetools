-- Add phone_number column to site_visits sign-in records
alter table public.site_visits
  add column if not exists phone_number text;
