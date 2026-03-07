-- ================================================================================
-- WhatsApp Nudge System — replaces geofence/push notification tracking
-- Adds a whatsapp_nudges table to track scheduled checkout reminders
-- ================================================================================

-- Create the nudges table
create table if not exists public.whatsapp_nudges (
  id            uuid        primary key default gen_random_uuid(),
  visit_id      uuid        not null references public.site_visits(id) on delete cascade,
  phone_number  text        not null,
  scheduled_at  timestamptz not null,
  sent_at       timestamptz,
  response      text,
  status        text        not null default 'pending'
                              check (status in ('pending', 'sent', 'responded', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- Index for the cron job: find pending nudges that are due
create index if not exists idx_nudges_pending
  on public.whatsapp_nudges (scheduled_at)
  where status = 'pending';

-- Index for looking up nudges by visit
create index if not exists idx_nudges_visit
  on public.whatsapp_nudges (visit_id);

-- Enable RLS
alter table public.whatsapp_nudges enable row level security;

-- Anon can read/write nudges (webhook needs access)
grant select, insert, update, delete on public.whatsapp_nudges to anon;
grant select, insert, update, delete on public.whatsapp_nudges to authenticated;

-- Policies: service role and authenticated users in the same org can access
create policy "nudges_anon_all" on public.whatsapp_nudges for all to anon using (true) with check (true);
create policy "nudges_auth_select" on public.whatsapp_nudges for select to authenticated
  using (visit_id in (
    select sv.id from public.site_visits sv
    join public.sites s on s.id = sv.site_id
    where s.org_id in (select public.get_my_org_ids())
       or (s.org_id is null and s.created_by = auth.uid())
  ));
