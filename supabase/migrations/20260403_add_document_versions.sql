-- Migration: Create site_document_versions table for document regeneration history
-- Created: 2026-04-03

CREATE TABLE site_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES site_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    summary_input TEXT NOT NULL,
    generated_content JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure version numbers are unique per document
    UNIQUE(document_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_site_document_versions_document_id ON site_document_versions(document_id);
CREATE INDEX idx_site_document_versions_created_at ON site_document_versions(created_at DESC);

-- Enable RLS
ALTER TABLE site_document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view versions for documents they have access to
CREATE POLICY site_document_versions_view
    ON site_document_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM site_documents sd
            JOIN company_memberships cm ON sd.company_id = cm.company_id
            WHERE sd.id = site_document_versions.document_id
            AND cm.user_id = auth.uid()
        )
    );

-- RLS Policies: Users can create versions for documents they have access to
CREATE POLICY site_document_versions_insert
    ON site_document_versions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM site_documents sd
            JOIN company_memberships cm ON sd.company_id = cm.company_id
            WHERE sd.id = site_document_versions.document_id
            AND cm.user_id = auth.uid()
        )
    );

-- Function to get next version number for a document
CREATE OR REPLACE FUNCTION get_next_document_version(doc_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM site_document_versions
    WHERE document_id = doc_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;
