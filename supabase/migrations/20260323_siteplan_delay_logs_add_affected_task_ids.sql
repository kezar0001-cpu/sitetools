-- Add affected_task_ids column to siteplan_delay_logs to persist the set of
-- task IDs whose dates were shifted by the delay cascade.  This lets the
-- reverse_siteplan_delay RPC undo those shifts without needing to re-traverse
-- the predecessor graph.

ALTER TABLE public.siteplan_delay_logs
  ADD COLUMN IF NOT EXISTS affected_task_ids uuid[] NOT NULL DEFAULT '{}';
