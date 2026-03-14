-- Add is_active flag to sites for soft-deletion (archival)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN sites.is_active IS 'When false the site is archived and no longer accepts sign-ins.';
