-- Add updated_by column to siteplan_tasks to track who last updated each task.
-- Used by the conflict resolution UI to show who made a remote change.

ALTER TABLE siteplan_tasks
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Trigger function: set updated_by = auth.uid() on every UPDATE
CREATE OR REPLACE FUNCTION siteplan_task_set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger (drop first so CREATE OR REPLACE works on the trigger itself)
DROP TRIGGER IF EXISTS siteplan_task_updated_by_trigger ON siteplan_tasks;
CREATE TRIGGER siteplan_task_updated_by_trigger
  BEFORE UPDATE ON siteplan_tasks
  FOR EACH ROW EXECUTE FUNCTION siteplan_task_set_updated_by();
