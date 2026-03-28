-- =============================================================
-- SiteITP additions: template library + audit log
-- =============================================================

-- ─────────────────────────────────────────────
-- Table: itp_templates
-- ─────────────────────────────────────────────
create table if not exists public.itp_templates (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  name                text not null,
  created_by_user_id  uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  items               jsonb not null default '[]'::jsonb
);

create index if not exists idx_itp_templates_company_id
  on public.itp_templates(company_id);

alter table public.itp_templates enable row level security;

create policy itp_templates_select on public.itp_templates
  for select to authenticated
  using (company_id in (select public.get_my_company_ids()));

create policy itp_templates_insert on public.itp_templates
  for insert to authenticated
  with check (company_id in (select public.get_my_company_ids()));

create policy itp_templates_delete on public.itp_templates
  for delete to authenticated
  using (company_id in (select public.get_my_company_ids()));

-- ─────────────────────────────────────────────
-- Table: itp_audit_log
-- ─────────────────────────────────────────────
create table if not exists public.itp_audit_log (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.itp_sessions(id) on delete cascade,
  item_id               uuid references public.itp_items(id) on delete set null,
  action                text not null
                          check (action in ('create','update','delete','sign','waive','archive')),
  performed_by_user_id  uuid references auth.users(id) on delete set null,
  performed_at          timestamptz not null default now(),
  old_values            jsonb,
  new_values            jsonb
);

create index if not exists idx_itp_audit_log_session_id
  on public.itp_audit_log(session_id, performed_at desc);

alter table public.itp_audit_log enable row level security;

-- Authenticated users in the same company can read audit logs
create policy itp_audit_log_select on public.itp_audit_log
  for select to authenticated
  using (
    exists (
      select 1 from public.itp_sessions s
      where s.id = itp_audit_log.session_id
        and s.company_id in (select public.get_my_company_ids())
    )
  );
