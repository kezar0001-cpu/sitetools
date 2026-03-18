-- =============================================================
-- SitePlan Daily Reports
-- Persists per-day metadata: weather, temperature, site status, notes.
-- One row per (project_id, report_date) — upsert-safe via UNIQUE.
-- =============================================================

CREATE TYPE siteplan_site_status AS ENUM (
  'on_programme',
  'at_risk',
  'delayed'
);

CREATE TABLE siteplan_daily_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date  date        NOT NULL,
  weather      text,
  temperature  integer,
  site_status  siteplan_site_status NOT NULL DEFAULT 'on_programme',
  notes        text,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, report_date)
);

-- Index for fast per-project lookups
CREATE INDEX siteplan_daily_reports_project_id_idx
  ON siteplan_daily_reports (project_id);

CREATE INDEX siteplan_daily_reports_date_idx
  ON siteplan_daily_reports (project_id, report_date DESC);

-- Auto-update updated_at
CREATE TRIGGER siteplan_daily_reports_updated_at
  BEFORE UPDATE ON siteplan_daily_reports
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Enable RLS
ALTER TABLE siteplan_daily_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read their project's reports
CREATE POLICY "org_isolation" ON siteplan_daily_reports
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: org members can create reports
CREATE POLICY "org_insert" ON siteplan_daily_reports
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: org members can update reports
CREATE POLICY "org_update" ON siteplan_daily_reports
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: org members can delete reports
CREATE POLICY "org_delete" ON siteplan_daily_reports
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Enable Realtime for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE siteplan_daily_reports;
