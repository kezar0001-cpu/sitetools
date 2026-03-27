-- =============================================================
-- SiteITP module — Inspection & Test Plan schema
-- Witness / hold-point sign-off with GPS and signature capture
-- =============================================================

-- ─────────────────────────────────────────────
-- Table: itp_sessions
-- ─────────────────────────────────────────────
create table if not exists public.itp_sessions (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,
  site_id             uuid references public.sites(id) on delete set null,
  task_description    text not null,
  created_by_user_id  uuid references auth.users(id) on delete set null,
  location_lat        double precision,
  location_lng        double precision,
  status              text not null default 'active'
                        check (status in ('active', 'complete', 'archived')),
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: itp_items
-- ─────────────────────────────────────────────
create table if not exists public.itp_items (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.itp_sessions(id) on delete cascade,
  type                text not null check (type in ('witness', 'hold')),
  title               text not null,
  description         text,
  sort_order          integer not null default 0,
  slug                text unique not null default substr(md5(random()::text), 1, 10),
  status              text not null default 'pending'
                        check (status in ('pending', 'signed', 'waived')),
  signed_off_at       timestamptz,
  signed_off_by_name  text,
  signature           text,   -- base64 PNG
  sign_off_lat        double precision,
  sign_off_lng        double precision,
  waive_reason        text,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Trigger: enrich slug with item id after insert
-- ─────────────────────────────────────────────
create or replace function public.itp_items_set_slug()
returns trigger as $fn$
begin
  if new.slug is null or new.slug = substr(md5(random()::text), 1, 10) then
    new.slug := substr(md5(random()::text || new.id::text), 1, 10);
  end if;
  return new;
end;
$fn$ language plpgsql;

drop trigger if exists trg_itp_items_set_slug on public.itp_items;
create trigger trg_itp_items_set_slug
  before insert on public.itp_items
  for each row execute function public.itp_items_set_slug();

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_itp_items_session_id
  on public.itp_items(session_id);

create unique index if not exists idx_itp_items_slug
  on public.itp_items(slug);

create index if not exists idx_itp_sessions_company_created
  on public.itp_sessions(company_id, created_at desc);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public.itp_sessions enable row level security;
alter table public.itp_items    enable row level security;

-- itp_sessions: authenticated company members can SELECT
create policy itp_sessions_select on public.itp_sessions
  for select to authenticated
  using (company_id in (select public.get_my_company_ids()));

-- itp_sessions: authenticated company members can INSERT
create policy itp_sessions_insert on public.itp_sessions
  for insert to authenticated
  with check (company_id in (select public.get_my_company_ids()));

-- itp_sessions: authenticated company members can UPDATE
create policy itp_sessions_update on public.itp_sessions
  for update to authenticated
  using  (company_id in (select public.get_my_company_ids()))
  with check (company_id in (select public.get_my_company_ids()));

-- itp_items: authenticated users can SELECT via session company
create policy itp_items_select on public.itp_items
  for select to authenticated
  using (
    exists (
      select 1 from public.itp_sessions s
      where s.id = itp_items.session_id
        and s.company_id in (select public.get_my_company_ids())
    )
  );

-- itp_items: authenticated users can INSERT via session company
create policy itp_items_insert on public.itp_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.itp_sessions s
      where s.id = itp_items.session_id
        and s.company_id in (select public.get_my_company_ids())
    )
  );

-- itp_items: authenticated users can UPDATE via session company
create policy itp_items_update on public.itp_items
  for update to authenticated
  using (
    exists (
      select 1 from public.itp_sessions s
      where s.id = itp_items.session_id
        and s.company_id in (select public.get_my_company_ids())
    )
  )
  with check (
    exists (
      select 1 from public.itp_sessions s
      where s.id = itp_items.session_id
        and s.company_id in (select public.get_my_company_ids())
    )
  );

-- itp_items sign-off: public (anon) UPDATE allowed only on pending items
-- The API route uses service role, but this policy covers direct anon sign-off flows
create policy itp_items_signoff_public on public.itp_items
  for update to anon
  using  (status = 'pending')
  with check (status in ('signed', 'waived'));
