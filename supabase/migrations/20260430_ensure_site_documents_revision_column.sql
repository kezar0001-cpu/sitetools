-- Migration: Ensure SiteDocs revision support exists in all environments
-- Fixes failures when editing document revision due to missing column.

ALTER TABLE site_documents
ADD COLUMN IF NOT EXISTS revision VARCHAR(20);

UPDATE site_documents
SET revision = 'Rev A'
WHERE revision IS NULL;

ALTER TABLE site_documents
ALTER COLUMN revision SET DEFAULT 'Rev A',
ALTER COLUMN revision SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_site_documents_revision ON site_documents(revision);

COMMENT ON COLUMN site_documents.revision IS 'Manual revision identifier (Rev A, Rev B, Rev C, etc.)';
