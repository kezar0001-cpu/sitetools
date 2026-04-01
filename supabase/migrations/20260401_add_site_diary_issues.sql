-- Add site_diary_issues table for tracking diary issues (Safety, Delay, RFI, Instruction, NCR)

create table if not exists public.site_diary_issues (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.site_diaries(id) on delete cascade,
  type text not null check (type in ('Safety', 'Delay', 'RFI', 'Instruction', 'NCR')),
  description text not null,
  responsible_party text,
  delay_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup by diary
create index if not exists idx_site_diary_issues_diary_id on public.site_diary_issues(diary_id);

-- Enable RLS
alter table public.site_diary_issues enable row level security;

-- RLS policy: users can read issues for diaries they have access to
-- (through their company's project/site relationship)
create policy "Allow read access to diary issues for company members"
  on public.site_diary_issues
  for select
  using (
    exists (
      select 1 from public.site_diaries sd
      join public.company_memberships cm on cm.company_id = sd.company_id
      where sd.id = site_diary_issues.diary_id
      and cm.user_id = auth.uid()
    )
  );

-- RLS policy: editors can create issues for their company's diaries
create policy "Allow insert access to diary issues for company editors"
  on public.site_diary_issues
  for insert
  with check (
    exists (
      select 1 from public.site_diaries sd
      join public.company_memberships cm on cm.company_id = sd.company_id
      where sd.id = site_diary_issues.diary_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin', 'manager', 'member')
    )
  );

-- RLS policy: editors can update/delete their company's issues
create policy "Allow update/delete access to diary issues for company editors"
  on public.site_diary_issues
  for all
  using (
    exists (
      select 1 from public.site_diaries sd
      join public.company_memberships cm on cm.company_id = sd.company_id
      where sd.id = site_diary_issues.diary_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin', 'manager', 'member')
    )
  );
