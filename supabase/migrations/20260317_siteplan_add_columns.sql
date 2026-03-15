-- =============================================================
-- SitePlan — add predecessors, assigned_to, comments columns
-- Safe to run on existing DB.
-- =============================================================

ALTER TABLE siteplan_tasks ADD COLUMN IF NOT EXISTS predecessors text;
ALTER TABLE siteplan_tasks ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE siteplan_tasks ADD COLUMN IF NOT EXISTS comments text;
