-- =============================================================
-- SitePlan module — fresh schema
-- Uses the existing `projects` table from Buildstate workspace.
-- =============================================================

-- Drop old planner tables if they exist
DROP TABLE IF EXISTS plan_task_dependencies CASCADE;
DROP TABLE IF EXISTS plan_task_updates CASCADE;
DROP TABLE IF EXISTS plan_revisions CASCADE;
DROP TABLE IF EXISTS plan_tasks CASCADE;
DROP TABLE IF EXISTS plan_phases CASCADE;
DROP TABLE IF EXISTS project_plan_sites CASCADE;
DROP TABLE IF EXISTS project_plans CASCADE;
DROP TABLE IF EXISTS siteplan_progress_log CASCADE;
DROP TABLE IF EXISTS siteplan_tasks CASCADE;
DROP TABLE IF EXISTS siteplan_projects CASCADE;

-- Drop old enums if exist
DROP TYPE IF EXISTS siteplan_task_type CASCADE;
DROP TYPE IF EXISTS siteplan_task_status CASCADE;

-- Enums
CREATE TYPE siteplan_task_type AS ENUM ('phase', 'task', 'subtask');
CREATE TYPE siteplan_task_status AS ENUM ('not_started', 'in_progress', 'completed', 'delayed', 'on_hold');

-- ===================== siteplan_tasks ========================
-- References existing projects table, NOT a separate siteplan_projects table
CREATE TABLE IF NOT EXISTS siteplan_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES siteplan_tasks(id) ON DELETE CASCADE,
  wbs_code      text NOT NULL DEFAULT '',
  name          text NOT NULL,
  type          siteplan_task_type NOT NULL DEFAULT 'task',
  status        siteplan_task_status NOT NULL DEFAULT 'not_started',
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  actual_start  date,
  actual_end    date,
  progress      int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  duration_days int GENERATED ALWAYS AS (end_date - start_date) STORED,
  predecessors  text,
  responsible   text,
  assigned_to   text,
  comments      text,
  notes         text,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_siteplan_tasks_project ON siteplan_tasks(project_id);
CREATE INDEX idx_siteplan_tasks_parent  ON siteplan_tasks(parent_id);

ALTER TABLE siteplan_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: tasks visible to members of the project's company
CREATE POLICY "org_isolation" ON siteplan_tasks
  USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  )));

CREATE POLICY "org_insert" ON siteplan_tasks
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  )));

CREATE POLICY "org_update" ON siteplan_tasks
  FOR UPDATE USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  )));

CREATE POLICY "org_delete" ON siteplan_tasks
  FOR DELETE USING (project_id IN (SELECT id FROM projects WHERE company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  )));

-- ===================== siteplan_progress_log =================
CREATE TABLE IF NOT EXISTS siteplan_progress_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES siteplan_tasks(id) ON DELETE CASCADE,
  progress_before int NOT NULL,
  progress_after  int NOT NULL,
  note            text,
  logged_by       uuid NOT NULL REFERENCES auth.users(id),
  logged_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_siteplan_progress_task ON siteplan_progress_log(task_id);

ALTER TABLE siteplan_progress_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON siteplan_progress_log
  USING (task_id IN (
    SELECT t.id FROM siteplan_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
  ));

CREATE POLICY "org_insert" ON siteplan_progress_log
  FOR INSERT WITH CHECK (task_id IN (
    SELECT t.id FROM siteplan_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
  ));

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION siteplan_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_siteplan_tasks_updated
  BEFORE UPDATE ON siteplan_tasks
  FOR EACH ROW EXECUTE FUNCTION siteplan_update_timestamp();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE siteplan_tasks;
