-- =============================================================
-- SitePlan — patch RLS so siteplan_tasks FK points at `projects`
-- Safe to run on existing DB: no table drops, no data loss.
-- =============================================================

-- 1. Drop old RLS policies that reference the removed siteplan_projects table
DROP POLICY IF EXISTS "org_isolation" ON siteplan_tasks;
DROP POLICY IF EXISTS "org_insert"    ON siteplan_tasks;
DROP POLICY IF EXISTS "org_update"    ON siteplan_tasks;
DROP POLICY IF EXISTS "org_delete"    ON siteplan_tasks;

-- 2. Re-create RLS referencing the existing `projects` table
CREATE POLICY "org_isolation" ON siteplan_tasks
  USING (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_insert" ON siteplan_tasks
  FOR INSERT WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_update" ON siteplan_tasks
  FOR UPDATE USING (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_delete" ON siteplan_tasks
  FOR DELETE USING (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

-- 3. Drop the old FK and re-point it at `projects`
ALTER TABLE siteplan_tasks
  DROP CONSTRAINT IF EXISTS siteplan_tasks_project_id_fkey;

ALTER TABLE siteplan_tasks
  ADD CONSTRAINT siteplan_tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 4. Also patch progress_log RLS if old policy exists
DROP POLICY IF EXISTS "org_isolation" ON siteplan_progress_log;
DROP POLICY IF EXISTS "org_insert"    ON siteplan_progress_log;

CREATE POLICY "org_isolation" ON siteplan_progress_log
  USING (task_id IN (
    SELECT t.id FROM siteplan_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_insert" ON siteplan_progress_log
  FOR INSERT WITH CHECK (task_id IN (
    SELECT t.id FROM siteplan_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));
