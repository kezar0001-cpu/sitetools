-- ─────────────────────────────────────────────────────────────────────────────
-- Soft-delete (Recycle Bin) for project_plans and plan_tasks
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add deleted_at columns ─────────────────────────────────────────────────

ALTER TABLE public.project_plans
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.plan_tasks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial indexes: only index the (rare) deleted rows for fast trash queries
CREATE INDEX IF NOT EXISTS idx_project_plans_deleted_at
  ON public.project_plans (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_tasks_deleted_at
  ON public.plan_tasks (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── 2. Update project_plans SELECT policy (exclude soft-deleted rows) ─────────

DROP POLICY IF EXISTS project_plans_select ON public.project_plans;

CREATE POLICY project_plans_select ON public.project_plans
  FOR SELECT USING (
    company_id IN (SELECT public.get_my_company_ids())
    AND deleted_at IS NULL
  );

-- ── 3. Replace plan_tasks_all with per-operation policies ────────────────────
--
-- Splitting the ALL policy is necessary because:
--   • SELECT must exclude deleted tasks (deleted_at IS NULL filter)
--   • UPDATE must NOT filter on deleted_at — we need to:
--       a) bulk-set tasks.deleted_at during soft-delete (while plan is still visible)
--       b) clear tasks.deleted_at during restore (after plan is undeleted first)
--   • DELETE must allow cascade from plan permanent-delete (no deleted_at filter)

DROP POLICY IF EXISTS plan_tasks_all ON public.plan_tasks;

-- SELECT: only non-deleted tasks from non-deleted plans
CREATE POLICY plan_tasks_select ON public.plan_tasks
  FOR SELECT USING (
    plan_tasks.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.project_plans pp
      WHERE pp.id = plan_tasks.plan_id
        AND pp.company_id IN (SELECT public.get_my_company_ids())
        AND pp.deleted_at IS NULL
    )
  );

-- INSERT: managers can create tasks on non-deleted plans
CREATE POLICY plan_tasks_insert ON public.plan_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_plans pp
      WHERE pp.id = plan_tasks.plan_id
        AND public.has_company_role(pp.company_id, ARRAY['owner', 'admin', 'manager'])
        AND pp.deleted_at IS NULL
    )
  );

-- UPDATE: managers can update tasks (no deleted_at guard — required for soft-delete & restore)
CREATE POLICY plan_tasks_update ON public.plan_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_plans pp
      WHERE pp.id = plan_tasks.plan_id
        AND public.has_company_role(pp.company_id, ARRAY['owner', 'admin', 'manager'])
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_plans pp
      WHERE pp.id = plan_tasks.plan_id
        AND public.has_company_role(pp.company_id, ARRAY['owner', 'admin', 'manager'])
    )
  );

-- DELETE: managers can hard-delete tasks (FK cascade from permanentlyDeletePlan also needs this)
CREATE POLICY plan_tasks_delete ON public.plan_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_plans pp
      WHERE pp.id = plan_tasks.plan_id
        AND public.has_company_role(pp.company_id, ARRAY['owner', 'admin', 'manager'])
    )
  );

-- ── 4. RPC: get_deleted_plans ─────────────────────────────────────────────────
--
-- Bypasses the SELECT policy's deleted_at IS NULL filter.
-- Still enforces company membership via get_my_company_ids().
-- Returns plans deleted within the last 30 days (auto-purge window).

CREATE OR REPLACE FUNCTION public.get_deleted_plans(p_company_id uuid)
RETURNS TABLE (
  id           uuid,
  company_id   uuid,
  project_id   uuid,
  name         text,
  description  text,
  status       text,
  version_no   int,
  created_by   uuid,
  updated_by   uuid,
  created_at   timestamptz,
  updated_at   timestamptz,
  deleted_at   timestamptz,
  project_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.id,
    pp.company_id,
    pp.project_id,
    pp.name,
    pp.description,
    pp.status::text,
    pp.version_no,
    pp.created_by,
    pp.updated_by,
    pp.created_at,
    pp.updated_at,
    pp.deleted_at,
    pr.name AS project_name
  FROM public.project_plans pp
  LEFT JOIN public.projects pr ON pr.id = pp.project_id
  WHERE pp.company_id = p_company_id
    AND pp.company_id IN (SELECT public.get_my_company_ids())
    AND pp.deleted_at IS NOT NULL
    AND pp.deleted_at > now() - interval '30 days'
  ORDER BY pp.deleted_at DESC;
$$;
