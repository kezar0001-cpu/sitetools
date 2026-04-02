-- Migration: Add completion workflow fields to site_diaries
-- This replaces the approval workflow with a simpler complete/export/auto-archive flow

-- Add completion fields
ALTER TABLE site_diaries
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS auto_archive_at timestamp with time zone;

-- First, migrate old statuses to 'draft' so we can safely modify the enum
-- 'approved' -> 'draft' (we'll identify these by approved_at later)
-- 'submitted' -> 'draft'
-- 'rejected' -> 'draft'
UPDATE site_diaries SET status = 'draft' WHERE status IN ('submitted', 'rejected', 'approved');

-- Commit the transaction to ensure the enum update is safe
COMMIT;

-- Add 'completed' to the enum type (must be committed before use)
ALTER TYPE diary_status ADD VALUE IF NOT EXISTS 'completed';

-- Add 'archived' to the enum type
ALTER TYPE diary_status ADD VALUE IF NOT EXISTS 'archived';

-- Commit again before using the new value
COMMIT;

-- Update status check constraint to use new statuses
ALTER TABLE site_diaries DROP CONSTRAINT IF EXISTS site_diaries_status_check;
ALTER TABLE site_diaries ADD CONSTRAINT site_diaries_status_check
  CHECK (status IN ('draft', 'completed', 'archived'));

-- Create index for auto-archive queries
CREATE INDEX IF NOT EXISTS idx_site_diaries_auto_archive 
ON site_diaries(auto_archive_at) 
WHERE status = 'completed';

-- Comment explaining the workflow
COMMENT ON COLUMN site_diaries.auto_archive_at IS 'Date when completed diary will be automatically archived (30 days after completion)';
COMMENT ON COLUMN site_diaries.completed_at IS 'Timestamp when diary was marked as complete';
COMMENT ON COLUMN site_diaries.completed_by IS 'User who completed the diary';
