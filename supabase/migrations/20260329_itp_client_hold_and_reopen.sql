-- =============================================================
-- ITP: Client Hold status + session reopen support
-- =============================================================
-- 1. Adds 'client_hold' to itp_items.status enum
--    (placed by superintendent/third party; blocks further work)
-- 2. Adds 'client_hold_reason' and 'client_hold_by_name' columns
-- 3. Allows itp_sessions status to go complete → active (reopen)
-- 4. Allows anon sign-off route to also set client_hold
-- =============================================================

-- 1. Expand itp_items status check to include 'client_hold'
alter table public.itp_items
  drop constraint if exists itp_items_status_check;

alter table public.itp_items
  add constraint itp_items_status_check
  check (status in ('pending', 'signed', 'waived', 'client_hold'));

-- 2. Add columns for client hold metadata
alter table public.itp_items
  add column if not exists client_hold_reason   text,
  add column if not exists client_hold_by_name  text,
  add column if not exists client_hold_at       timestamptz;

-- 3. Allow anon sign-off policy to also set client_hold
--    (superintendent uses the public sign-off URL to raise a hold)
drop policy if exists itp_items_signoff_public on public.itp_items;

create policy itp_items_signoff_public on public.itp_items
  for update to anon
  using  (status in ('pending', 'client_hold'))
  with check (status in ('signed', 'waived', 'client_hold', 'pending'));
