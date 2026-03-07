-- Buildstate Planner V5 — Schema Upgrade
-- Adds delay types, weather logging, council tracking, public holidays,
-- task hierarchy, site linking, milestone support, expanded dependencies

-- 1) Delay type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'delay_type'
  ) THEN
    CREATE TYPE public.delay_type AS ENUM (
      'weather', 'redesign', 'council', 'rfi',
      'utility', 'client', 'supply', 'other'
    );
  END IF;
END $$;

-- 2) Extend plan_tasks with V5 columns
ALTER TABLE public.plan_tasks
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wbs_code text,
  ADD COLUMN IF NOT EXISTS is_milestone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.plan_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS indent_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_type public.delay_type,
  ADD COLUMN IF NOT EXISTS council_waiting_on text,
  ADD COLUMN IF NOT EXISTS council_submitted_date date,
  ADD COLUMN IF NOT EXISTS weather_delay_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS redesign_delay_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS redesign_reason text;

-- 3) Expand dependency types (FS, FF, SS, SF)
ALTER TABLE public.task_dependencies
  DROP CONSTRAINT IF EXISTS task_dependencies_dependency_type_check;

ALTER TABLE public.task_dependencies
  ADD CONSTRAINT task_dependencies_dependency_type_check
  CHECK (dependency_type IN ('FS', 'FF', 'SS', 'SF'));

-- 4) Public holidays table
CREATE TABLE IF NOT EXISTS public.public_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  name text NOT NULL,
  state_code text,  -- e.g. 'NSW', 'VIC', 'QLD', null = national
  is_national boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_holidays_date ON public.public_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_public_holidays_company ON public.public_holidays(company_id);

-- 5) Weather delay log
CREATE TABLE IF NOT EXISTS public.weather_delay_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.project_plans(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.plan_tasks(id) ON DELETE SET NULL,
  delay_date date NOT NULL DEFAULT current_date,
  hours_lost numeric(4,1) NOT NULL DEFAULT 0,
  reason text,
  logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weather_delay_log_plan ON public.weather_delay_log(plan_id);
CREATE INDEX IF NOT EXISTS idx_weather_delay_log_task ON public.weather_delay_log(task_id);

-- 6) Additional indexes for V5 columns
CREATE INDEX IF NOT EXISTS idx_plan_tasks_site ON public.plan_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_parent ON public.plan_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_delay_type ON public.plan_tasks(plan_id, delay_type) WHERE delay_type IS NOT NULL;

-- 7) RLS for new tables
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_delay_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_holidays_select ON public.public_holidays
FOR SELECT TO authenticated
USING (
  company_id IS NULL
  OR company_id IN (SELECT public.get_my_company_ids())
);

CREATE POLICY public_holidays_manage ON public.public_holidays
FOR ALL TO authenticated
USING (
  company_id IS NOT NULL
  AND public.has_company_role(company_id, ARRAY['owner'::public.company_role,'admin'::public.company_role])
)
WITH CHECK (
  company_id IS NOT NULL
  AND public.has_company_role(company_id, ARRAY['owner'::public.company_role,'admin'::public.company_role])
);

CREATE POLICY weather_delay_log_all ON public.weather_delay_log
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_plans pp
    WHERE pp.id = weather_delay_log.plan_id
      AND pp.company_id IN (SELECT public.get_my_company_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_plans pp
    WHERE pp.id = weather_delay_log.plan_id
      AND public.has_company_role(pp.company_id, ARRAY['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role])
  )
);

-- 8) Seed Australian national holidays for 2026
INSERT INTO public.public_holidays (holiday_date, name, state_code, is_national) VALUES
  ('2026-01-01', 'New Year''s Day', NULL, true),
  ('2026-01-26', 'Australia Day', NULL, true),
  ('2026-04-03', 'Good Friday', NULL, true),
  ('2026-04-04', 'Saturday before Easter', NULL, true),
  ('2026-04-06', 'Easter Monday', NULL, true),
  ('2026-04-25', 'ANZAC Day', NULL, true),
  ('2026-06-08', 'Queen''s Birthday', 'NSW', false),
  ('2026-06-08', 'Queen''s Birthday', 'VIC', false),
  ('2026-06-08', 'Queen''s Birthday', 'SA', false),
  ('2026-06-08', 'Queen''s Birthday', 'TAS', false),
  ('2026-06-08', 'Queen''s Birthday', 'ACT', false),
  ('2026-10-05', 'Queen''s Birthday', 'QLD', false),
  ('2026-09-28', 'Queen''s Birthday', 'WA', false),
  ('2026-12-25', 'Christmas Day', NULL, true),
  ('2026-12-28', 'Boxing Day (observed)', NULL, true)
ON CONFLICT DO NOTHING;
