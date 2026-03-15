-- =============================================================
-- SitePlan — baselines (schedule snapshots)
-- =============================================================

CREATE TABLE IF NOT EXISTS siteplan_baselines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  snapshot    jsonb NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_siteplan_baselines_project ON siteplan_baselines(project_id);

ALTER TABLE siteplan_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON siteplan_baselines
  USING (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_insert" ON siteplan_baselines
  FOR INSERT WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "org_delete" ON siteplan_baselines
  FOR DELETE USING (project_id IN (
    SELECT id FROM projects WHERE company_id IN (
      SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
    )
  ));
