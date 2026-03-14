-- Buildstate Site Diary (Daily Site Log) foundation
-- Allows site supervisors to log weather, workforce, equipment, events, and photos

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- Enum: diary status
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'diary_status'
  ) THEN
    CREATE TYPE public.diary_status AS ENUM ('draft', 'submitted', 'approved');
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- Table: site_diaries
-- ─────────────────────────────────────────────
create table if not exists public.site_diaries (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  site_id       uuid references public.sites(id) on delete set null,
  date          date not null default current_date,
  weather       jsonb not null default '{}'::jsonb,
  -- jsonb shape: { conditions: string, temp_min: number, temp_max: number, wind: string }
  notes         text,
  status        public.diary_status not null default 'draft',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: site_diary_labor
-- ─────────────────────────────────────────────
create table if not exists public.site_diary_labor (
  id                uuid primary key default gen_random_uuid(),
  diary_id          uuid not null references public.site_diaries(id) on delete cascade,
  trade_or_company  text not null,
  worker_count      integer not null check (worker_count > 0),
  hours_worked      numeric(5, 2) not null check (hours_worked > 0),
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: site_diary_equipment
-- ─────────────────────────────────────────────
create table if not exists public.site_diary_equipment (
  id              uuid primary key default gen_random_uuid(),
  diary_id        uuid not null references public.site_diaries(id) on delete cascade,
  equipment_type  text not null,
  quantity        integer not null default 1 check (quantity > 0),
  hours_used      numeric(5, 2) not null check (hours_used > 0),
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: site_diary_photos
-- ─────────────────────────────────────────────
create table if not exists public.site_diary_photos (
  id            uuid primary key default gen_random_uuid(),
  diary_id      uuid not null references public.site_diaries(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_site_diaries_company_date
  on public.site_diaries(company_id, date desc);

create index if not exists idx_site_diaries_project
  on public.site_diaries(project_id);

create index if not exists idx_site_diaries_site
  on public.site_diaries(site_id);

create index if not exists idx_site_diaries_created_by
  on public.site_diaries(created_by);

create index if not exists idx_site_diary_labor_diary
  on public.site_diary_labor(diary_id);

create index if not exists idx_site_diary_equipment_diary
  on public.site_diary_equipment(diary_id);

create index if not exists idx_site_diary_photos_diary
  on public.site_diary_photos(diary_id);

-- ─────────────────────────────────────────────
-- Updated-at trigger (reuses existing function)
-- ─────────────────────────────────────────────
drop trigger if exists site_diaries_set_updated_at on public.site_diaries;
create trigger site_diaries_set_updated_at
before update on public.site_diaries
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public.site_diaries       enable row level security;
alter table public.site_diary_labor   enable row level security;
alter table public.site_diary_equipment enable row level security;
alter table public.site_diary_photos  enable row level security;

-- site_diaries: all company members can view, managers+ can mutate
create policy site_diaries_select on public.site_diaries
for select to authenticated
using (company_id in (select public.get_my_company_ids()));

create policy site_diaries_insert on public.site_diaries
for insert to authenticated
with check (
  public.has_company_role(
    company_id,
    array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role, 'member'::public.company_role]
  )
);

create policy site_diaries_update on public.site_diaries
for update to authenticated
using (
  company_id in (select public.get_my_company_ids())
  and (
    created_by = auth.uid()
    or public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role])
  )
)
with check (
  company_id in (select public.get_my_company_ids())
  and (
    created_by = auth.uid()
    or public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role])
  )
);

create policy site_diaries_delete on public.site_diaries
for delete to authenticated
using (
  public.has_company_role(company_id, array['owner'::public.company_role, 'admin'::public.company_role])
);

-- site_diary_labor: inherit access from parent diary
create policy site_diary_labor_select on public.site_diary_labor
for select to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_labor.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_labor_insert on public.site_diary_labor
for insert to authenticated
with check (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_labor.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_labor_update on public.site_diary_labor
for update to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_labor.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_labor.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_labor_delete on public.site_diary_labor
for delete to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_labor.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

-- site_diary_equipment: inherit access from parent diary
create policy site_diary_equipment_select on public.site_diary_equipment
for select to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_equipment.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_equipment_insert on public.site_diary_equipment
for insert to authenticated
with check (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_equipment.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_equipment_update on public.site_diary_equipment
for update to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_equipment.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
)
with check (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_equipment.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_equipment_delete on public.site_diary_equipment
for delete to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_equipment.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

-- site_diary_photos: inherit access from parent diary
create policy site_diary_photos_select on public.site_diary_photos
for select to authenticated
using (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_photos.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_photos_insert on public.site_diary_photos
for insert to authenticated
with check (
  exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_photos.diary_id
      and sd.company_id in (select public.get_my_company_ids())
  )
);

create policy site_diary_photos_delete on public.site_diary_photos
for delete to authenticated
using (
  uploaded_by = auth.uid()
  or exists (
    select 1 from public.site_diaries sd
    where sd.id = site_diary_photos.diary_id
      and public.has_company_role(sd.company_id, array['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role])
  )
);

-- ─────────────────────────────────────────────
-- Storage bucket: diary_media
-- (Supabase SQL API — insert is idempotent via on conflict)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary_media',
  'diary_media',
  false,                          -- private bucket; we generate signed URLs
  20971520,                       -- 20 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload to diary_media
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'diary_media_insert'
  ) then
    execute $policy$
      create policy diary_media_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'diary_media')
    $policy$;
  end if;
end $$;

-- Storage RLS: authenticated users can view objects in diary_media
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'diary_media_select'
  ) then
    execute $policy$
      create policy diary_media_select on storage.objects
      for select to authenticated
      using (bucket_id = 'diary_media')
    $policy$;
  end if;
end $$;

-- Storage RLS: uploader or manager+ can delete their own media
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'diary_media_delete'
  ) then
    execute $policy$
      create policy diary_media_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'diary_media' and owner = auth.uid())
    $policy$;
  end if;
end $$;
