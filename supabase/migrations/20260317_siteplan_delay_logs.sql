-- Delay logging table for SitePlan tasks
-- Tracks delay events with category, reason, and cascade behaviour

create table if not exists public.siteplan_delay_logs (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.siteplan_tasks(id) on delete cascade,
  delay_days  integer not null check (delay_days > 0),
  delay_reason text not null,
  delay_category text not null check (delay_category in (
    'Weather', 'Subcontractor', 'Materials', 'Design Change',
    'Authority / Council', 'Scope Change', 'Other'
  )),
  logged_by   uuid not null references auth.users(id),
  logged_at   timestamptz not null default now(),
  impacts_completion boolean not null default true
);

-- Index for fast lookup by task
create index if not exists idx_siteplan_delay_logs_task
  on public.siteplan_delay_logs(task_id);

-- Index for daily summary queries (delays logged on a given day)
create index if not exists idx_siteplan_delay_logs_date
  on public.siteplan_delay_logs(logged_at);

-- RLS policies (same pattern as other siteplan tables)
alter table public.siteplan_delay_logs enable row level security;

create policy "Users can view delay logs for their company's projects"
  on public.siteplan_delay_logs for select
  using (
    exists (
      select 1 from public.siteplan_tasks st
      join public.projects p on p.id = st.project_id
      join public.company_memberships cm on cm.company_id = p.company_id
      where st.id = siteplan_delay_logs.task_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Users can insert delay logs for their company's projects"
  on public.siteplan_delay_logs for insert
  with check (
    exists (
      select 1 from public.siteplan_tasks st
      join public.projects p on p.id = st.project_id
      join public.company_memberships cm on cm.company_id = p.company_id
      where st.id = siteplan_delay_logs.task_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Users can update delay logs for their company's projects"
  on public.siteplan_delay_logs for update
  using (
    exists (
      select 1 from public.siteplan_tasks st
      join public.projects p on p.id = st.project_id
      join public.company_memberships cm on cm.company_id = p.company_id
      where st.id = siteplan_delay_logs.task_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Users can delete delay logs for their company's projects"
  on public.siteplan_delay_logs for delete
  using (
    exists (
      select 1 from public.siteplan_tasks st
      join public.projects p on p.id = st.project_id
      join public.company_memberships cm on cm.company_id = p.company_id
      where st.id = siteplan_delay_logs.task_id
        and cm.user_id = auth.uid()
    )
  );

-- Enable realtime for live delay updates
alter publication supabase_realtime add table public.siteplan_delay_logs;
