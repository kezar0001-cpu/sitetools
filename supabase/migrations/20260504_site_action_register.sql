-- Buildstate SiteDocs shared project action register
-- Adds first-class project action items, update history, and secure client register links.

create extension if not exists pgcrypto;

create table if not exists public.site_action_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_document_id uuid references public.site_documents(id) on delete set null,
  source_document_title text,
  source_document_reference text,
  source text not null default 'meeting-minutes' check (source in ('meeting-minutes', 'manual', 'imported')),
  generated_action_id text,
  generated_source_key text,
  action_number text,
  description text not null,
  responsible text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in-progress', 'council-response-provided', 'closed')),
  latest_update_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_action_updates (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.site_action_items(id) on delete cascade,
  previous_status text check (previous_status is null or previous_status in ('open', 'in-progress', 'council-response-provided', 'closed')),
  new_status text not null check (new_status in ('open', 'in-progress', 'council-response-provided', 'closed')),
  comment text not null check (length(trim(comment)) > 0),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null,
  updated_by_email text,
  updated_by_organisation text,
  updated_by_role text,
  source text not null check (source in ('internal', 'client_link')),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'site_action_items'
      and constraint_name = 'site_action_items_latest_update_id_fkey'
  ) then
    alter table public.site_action_items
      add constraint site_action_items_latest_update_id_fkey
      foreign key (latest_update_id) references public.site_action_updates(id) on delete set null;
  end if;
end $$;

create table if not exists public.site_action_register_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  token_hash text not null,
  recipient_name text,
  recipient_email text,
  recipient_organisation text,
  role text not null default 'client_representative',
  identity_confirmed_at timestamptz,
  permissions jsonb not null default '{"view": true, "update_status": true, "comment": true}'::jsonb,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_action_items_company_project on public.site_action_items(company_id, project_id);
create index if not exists idx_site_action_items_status on public.site_action_items(status);
create index if not exists idx_site_action_items_due_date on public.site_action_items(due_date);
create index if not exists idx_site_action_items_source_document on public.site_action_items(source_document_id);
create unique index if not exists idx_site_action_items_generated_source_key
  on public.site_action_items(company_id, generated_source_key)
  where generated_source_key is not null;

create index if not exists idx_site_action_updates_action_item_created on public.site_action_updates(action_item_id, created_at desc);
create index if not exists idx_site_action_register_links_project on public.site_action_register_links(project_id);
create unique index if not exists idx_site_action_register_links_token_hash on public.site_action_register_links(token_hash);

drop trigger if exists site_action_items_set_updated_at on public.site_action_items;
create trigger site_action_items_set_updated_at
before update on public.site_action_items
for each row execute function public.set_updated_at();

create or replace function public.apply_site_action_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_action_items
  set status = new.new_status,
      latest_update_id = new.id,
      updated_at = now()
  where id = new.action_item_id;

  return new;
end;
$$;

drop trigger if exists site_action_update_after_insert on public.site_action_updates;
create trigger site_action_update_after_insert
after insert on public.site_action_updates
for each row execute function public.apply_site_action_update();

alter table public.site_action_items enable row level security;
alter table public.site_action_updates enable row level security;
alter table public.site_action_register_links enable row level security;

drop policy if exists site_action_items_select on public.site_action_items;
drop policy if exists site_action_items_insert on public.site_action_items;
drop policy if exists site_action_items_update on public.site_action_items;
drop policy if exists site_action_updates_select on public.site_action_updates;
drop policy if exists site_action_updates_insert on public.site_action_updates;

create policy site_action_items_select
  on public.site_action_items
  for select
  to authenticated
  using (company_id in (select public.get_my_company_ids()));

create policy site_action_items_insert
  on public.site_action_items
  for insert
  to authenticated
  with check (company_id in (select public.get_my_company_ids()));

create policy site_action_items_update
  on public.site_action_items
  for update
  to authenticated
  using (company_id in (select public.get_my_company_ids()))
  with check (company_id in (select public.get_my_company_ids()));

create policy site_action_updates_select
  on public.site_action_updates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.site_action_items sai
      where sai.id = site_action_updates.action_item_id
        and sai.company_id in (select public.get_my_company_ids())
    )
  );

create policy site_action_updates_insert
  on public.site_action_updates
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.site_action_items sai
      where sai.id = site_action_updates.action_item_id
        and sai.company_id in (select public.get_my_company_ids())
    )
  );

comment on table public.site_action_items is 'Shared project action register items sourced from SiteDocs meeting minutes/documents or created manually.';
comment on table public.site_action_updates is 'Mandatory comment history for every action item status change.';
comment on table public.site_action_register_links is 'Secure external client access links for project-scoped action registers. Token hashes only are stored.';