-- =============================================================
-- SitePlan baselines — add schema_version column
-- =============================================================

ALTER TABLE siteplan_baselines
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
