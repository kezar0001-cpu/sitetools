-- Defense-in-depth: prevent tasks where end_date precedes start_date,
-- which would produce negative duration_days and corrupt Gantt rendering.
ALTER TABLE siteplan_tasks
  ADD CONSTRAINT chk_dates CHECK (end_date >= start_date);
