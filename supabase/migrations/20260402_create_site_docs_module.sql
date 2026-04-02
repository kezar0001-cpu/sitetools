-- Migration: SiteDocs Document Generation Module
-- Creates table for storing AI-generated professional documents

-- ── Create site_documents table ──
CREATE TABLE IF NOT EXISTS site_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN (
            'meeting-minutes',
            'incident-report',
            'corrective-action',
            'safety-report',
            'rfi',
            'daily-progress',
            'inspection-checklist',
            'toolbox-talk'
        )
    ),
    
    title VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100),
    summary_input TEXT NOT NULL,
    generated_content JSONB NOT NULL DEFAULT '{}',
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ── Indexes ──
CREATE INDEX idx_site_documents_company ON site_documents(company_id);
CREATE INDEX idx_site_documents_project ON site_documents(project_id);
CREATE INDEX idx_site_documents_type ON site_documents(document_type);
CREATE INDEX idx_site_documents_status ON site_documents(status);
CREATE INDEX idx_site_documents_created ON site_documents(created_at DESC);

-- ── Enable Row Level Security ──
ALTER TABLE site_documents ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──
-- Allow users to view documents from their companies
CREATE POLICY "Users can view their company documents" 
ON site_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM company_memberships 
        WHERE company_id = site_documents.company_id 
        AND user_id = auth.uid()
    )
);

-- Allow users to create documents for their companies
CREATE POLICY "Users can create documents in their companies" 
ON site_documents FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM company_memberships 
        WHERE company_id = site_documents.company_id 
        AND user_id = auth.uid()
    )
);

-- Allow users to update documents from their companies
CREATE POLICY "Users can update their company documents" 
ON site_documents FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM company_memberships 
        WHERE company_id = site_documents.company_id 
        AND user_id = auth.uid()
    )
);

-- Allow users to delete documents from their companies
CREATE POLICY "Users can delete their company documents" 
ON site_documents FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM company_memberships 
        WHERE company_id = site_documents.company_id 
        AND user_id = auth.uid()
    )
);

-- ── Updated_at trigger ──
CREATE OR REPLACE FUNCTION update_site_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_documents_updated_at
    BEFORE UPDATE ON site_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_site_documents_updated_at();

COMMENT ON TABLE site_documents IS 'AI-generated professional documents from text summaries';
COMMENT ON COLUMN site_documents.summary_input IS 'Raw user input before AI processing';
COMMENT ON COLUMN site_documents.generated_content IS 'Structured JSON output from AI generation';
