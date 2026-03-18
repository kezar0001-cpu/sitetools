-- Add 'milestone' to the siteplan_task_type enum
-- Milestones are zero-duration markers for key project dates.
ALTER TYPE siteplan_task_type ADD VALUE IF NOT EXISTS 'milestone';
