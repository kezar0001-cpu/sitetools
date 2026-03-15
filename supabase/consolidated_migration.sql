-- SAFE VERSION — only adds what's missing, never drops data

-- Add columns if missing
ALTER TABLE siteplan_tasks ADD COLUMN IF NOT EXISTS predecessors text;
ALTER TABLE siteplan_tasks ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE siteplan_tasks ADD COLUMN IF NOT EXISTS comments text;

-- Fix FK
ALTER TABLE siteplan_tasks DROP CONSTRAINT IF EXISTS siteplan_tasks_project_id_fkey;
ALTER TABLE siteplan_tasks ADD CONSTRAINT siteplan_tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Refresh RLS on siteplan_tasks
DROP POLICY IF EXISTS "org_isolation" ON siteplan_tasks;
DROP POLICY IF EXISTS "org_insert" ON siteplan_tasks;
DROP POLICY IF EXISTS "org_update" ON siteplan_tasks;
DROP POLICY IF EXISTS "org_delete" ON siteplan_tasks;

CREATE POLICY "org_isolation" ON siteplan_tasks
  USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

CREATE POLICY "org_insert" ON siteplan_tasks
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

CREATE POLICY "org_update" ON siteplan_tasks
  FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

CREATE POLICY "org_delete" ON siteplan_tasks
  FOR DELETE USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

-- Refresh RLS on progress_log
DROP POLICY IF EXISTS "org_isolation" ON siteplan_progress_log;
DROP POLICY IF EXISTS "org_insert" ON siteplan_progress_log;

CREATE POLICY "org_isolation" ON siteplan_progress_log
  USING (task_id IN (
    SELECT sp_t.id FROM siteplan_tasks sp_t
    JOIN projects sp_p ON sp_p.id = sp_t.project_id
    WHERE sp_p.company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_insert" ON siteplan_progress_log
  FOR INSERT WITH CHECK (task_id IN (
    SELECT sp_t.id FROM siteplan_tasks sp_t
    JOIN projects sp_p ON sp_p.id = sp_t.project_id
    WHERE sp_p.company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

-- Trigger
CREATE OR REPLACE FUNCTION siteplan_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_siteplan_tasks_updated ON siteplan_tasks;
CREATE TRIGGER trg_siteplan_tasks_updated
  BEFORE UPDATE ON siteplan_tasks
  FOR EACH ROW EXECUTE FUNCTION siteplan_update_timestamp();

-- Baselines table
CREATE TABLE IF NOT EXISTS siteplan_baselines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  snapshot    jsonb NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_siteplan_baselines_project ON siteplan_baselines(project_id);
ALTER TABLE siteplan_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON siteplan_baselines;
DROP POLICY IF EXISTS "org_insert" ON siteplan_baselines;
DROP POLICY IF EXISTS "org_delete" ON siteplan_baselines;

CREATE POLICY "org_isolation" ON siteplan_baselines
  USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

CREATE POLICY "org_insert" ON siteplan_baselines
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

CREATE POLICY "org_delete" ON siteplan_baselines
  FOR DELETE USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid())));

-- Dashboard RPC
CREATE OR REPLACE FUNCTION public.get_siteplan_projects_with_stats(p_company_id uuid)
RETURNS TABLE (
  id          uuid,
  company_id  uuid,
  name        text,
  description text,
  status      text,
  created_by  uuid,
  created_at  timestamptz,
  updated_at  timestamptz,
  task_count  bigint,
  avg_progress int,
  has_delayed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    proj.id,
    proj.company_id,
    proj.name,
    proj.description,
    proj.status,
    proj.created_by,
    proj.created_at,
    proj.updated_at,
    COALESCE(stats.task_count, 0) AS task_count,
    COALESCE(stats.avg_progress, 0) AS avg_progress,
    COALESCE(stats.has_delayed, false) AS has_delayed
  FROM projects proj
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::bigint AS task_count,
      ROUND(AVG(tsk.progress))::int AS avg_progress,
      BOOL_OR(tsk.status = 'delayed') AS has_delayed
    FROM siteplan_tasks tsk
    WHERE tsk.project_id = proj.id
  ) stats ON true
  WHERE proj.company_id = p_company_id
    AND proj.status IN ('active', 'on-hold')
    AND EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = p_company_id
        AND cm.user_id = auth.uid()
    )
  ORDER BY proj.created_at DESC;
$$;
