-- Migration: Add manual revision control to site_documents
-- Allows users to set custom revisions (Rev A, Rev B, etc.) independently of status

-- Add revision column with default 'Rev A'
ALTER TABLE site_documents 
ADD COLUMN IF NOT EXISTS revision VARCHAR(20) NOT NULL DEFAULT 'Rev A';

-- Create index for revision filtering
CREATE INDEX IF NOT EXISTS idx_site_documents_revision ON site_documents(revision);

-- Update existing records: derive revision from current status as starting point
UPDATE site_documents 
SET revision = CASE 
    WHEN status = 'finalised' THEN 'Rev C'
    WHEN status = 'shared' THEN 'Rev B'
    ELSE 'Rev A'
END
WHERE revision IS NULL OR revision = 'Rev A';

COMMENT ON COLUMN site_documents.revision IS 'Manual revision identifier (Rev A, Rev B, Rev C, etc.)';
