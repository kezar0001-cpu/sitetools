-- Buildstate Planner (Project Planning + Daily Tracking) foundation
-- Simplified Smartsheet/Project hybrid scoped to company/workspace

create extension if not exists pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'plan_status'
  ) THEN
    CREATE TYPE public.plan_status AS ENUM ('draft', 'active', 'on-hold', 'completed', 'archived');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'task_status'
  ) THEN
    CREATE TYPE public.task_status AS ENUM ('not-started', 'in-progress', 'blocked', 'done');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'task_priority'
  ) THEN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

create table if not exists public.project_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  description text,
  status public.plan_status not null default 'draft',
  version_no integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_plan_sites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.project_plans(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (plan_id, site_id)
);

create table if not exists public.plan_phases (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.project_plans(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  color text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.project_plans(id) on delete cascade,
  phase_id uuid references public.plan_phases(id) on delete set null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status public.task_status not null default 'not-started',
  priority public.task_priority not null default 'medium',
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  planned_start date,
  planned_finish date,
  actual_start timestamptz,
  actual_finish timestamptz,
  duration_days integer,
  manual_dates boolean not null default true,
  assigned_to uuid references public.profiles(id) on delete set null,
  constraint_note text,
  delay_reason text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.project_plans(id) on delete cascade,
  predecessor_task_id uuid not null references public.plan_tasks(id) on delete cascade,
  successor_task_id uuid not null references public.plan_tasks(id) on delete cascade,
  dependency_type text not null default 'FS' check (dependency_type in ('FS')),
  lag_days integer not null default 0,
  created_at timestamptz not null default now(),
  constraint task_dependencies_predecessor_successor_diff check (predecessor_task_id <> successor_task_id),
  unique (predecessor_task_id, successor_task_id)
);

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.project_plans(id) on delete cascade,
  task_id uuid not null references public.plan_tasks(id) on delete cascade,
  update_date date not null default current_date,
  status public.task_status,
  percent_complete integer check (percent_complete between 0 and 100),
  note text,
  delay_reason text,
  blocked boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_revisions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.project_plans(id) on delete cascade,
  revision_no integer not null,
  revision_type text not null,
  summary text,
  payload jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, revision_no)
);

-- Indexes
create index if not exists idx_project_plans_company on public.project_plans(company_id);
create index if not exists idx_project_plans_project on public.project_plans(project_id);
create index if not exists idx_project_plan_sites_plan on public.project_plan_sites(plan_id);
create index if not exists idx_project_plan_sites_site on public.project_plan_sites(site_id);
create index if not exists idx_plan_phases_plan_sort on public.plan_phases(plan_id, sort_order);
create index if not exists idx_plan_tasks_plan_sort on public.plan_tasks(plan_id, sort_order);
create index if not exists idx_plan_tasks_status on public.plan_tasks(plan_id, status);
create index if not exists idx_task_updates_task_date on public.task_updates(task_id, update_date desc);

-- Updated at triggers
drop trigger if exists project_plans_set_updated_at on public.project_plans;
create trigger project_plans_set_updated_at
before update on public.project_plans
for each row execute function public.set_updated_at();

drop trigger if exists plan_phases_set_updated_at on public.plan_phases;
create trigger plan_phases_set_updated_at
before update on public.plan_phases
for each row execute function public.set_updated_at();

drop trigger if exists plan_tasks_set_updated_at on public.plan_tasks;
create trigger plan_tasks_set_updated_at
before update on public.plan_tasks
for each row execute function public.set_updated_at();

-- RLS
alter table public.project_plans enable row level security;
alter table public.project_plan_sites enable row level security;
alter table public.plan_phases enable row level security;
alter table public.plan_tasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_updates enable row level security;
alter table public.plan_revisions enable row level security;

create policy project_plans_select on public.project_plans
for select to authenticated
using (company_id in (select public.get_my_company_ids()));

create policy project_plans_insert on public.project_plans
for insert to authenticated
with check (public.has_company_role(company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role]));

create policy project_plans_update on public.project_plans
for update to authenticated
using (public.has_company_role(company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role]))
with check (public.has_company_role(company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role]));

create policy project_plans_delete on public.project_plans
for delete to authenticated
using (public.has_company_role(company_id, array['owner'::public.company_role,'admin'::public.company_role]));

create policy project_plan_sites_all on public.project_plan_sites
for all to authenticated
using (
  exists (
    select 1 from public.project_plans pp
    where pp.id = project_plan_sites.plan_id
      and pp.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.project_plans pp
    where pp.id = project_plan_sites.plan_id
      and public.has_company_role(pp.company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);

create policy plan_phases_all on public.plan_phases
for all to authenticated
using (
  exists (
    select 1 from public.project_plans pp
    where pp.id = plan_phases.plan_id
      and pp.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.project_plans pp
    where pp.id = plan_phases.plan_id
      and public.has_company_role(pp.company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);

create policy plan_tasks_all on public.plan_tasks
for all to authenticated
using (
  exists (
    select 1 from public.project_plans pp
    where pp.id = plan_tasks.plan_id
      and pp.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.project_plans pp
    where pp.id = plan_tasks.plan_id
      and public.has_company_role(pp.company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);

create policy task_dependencies_all on public.task_dependencies
for all to authenticated
using (
  exists (
    select 1 from public.project_plans pp
    where pp.id = task_dependencies.plan_id
      and pp.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.project_plans pp
    where pp.id = task_dependencies.plan_id
      and public.has_company_role(pp.company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);

create policy task_updates_all on public.task_updates
for all to authenticated
using (
  exists (
    select 1 from public.project_plans pp
    where pp.id = task_updates.plan_id
      and pp.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.project_plans pp
    where pp.id = task_updates.plan_id
      and public.has_company_role(pp.company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);

create policy plan_revisions_all on public.plan_revisions
for all to authenticated
using (
  exists (
    select 1 from public.project_plans pp
    where pp.id = plan_revisions.plan_id
      and pp.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.project_plans pp
    where pp.id = plan_revisions.plan_id
      and public.has_company_role(pp.company_id, array['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);
