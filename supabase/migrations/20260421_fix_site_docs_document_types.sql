-- Migration: Fix SiteDocs document type constraint
-- Adds missing 'site-instruction-issue' and 'site-instruction-acknowledge' types
-- Keeps 'site-instruction' for backward compatibility with any existing documents

-- Drop the existing check constraint
ALTER TABLE site_documents DROP CONSTRAINT IF EXISTS site_documents_document_type_check;

-- Add the corrected check constraint with all valid document types
ALTER TABLE site_documents ADD CONSTRAINT site_documents_document_type_check
    CHECK (
        document_type IN (
            'meeting-minutes',
            'incident-report',
            'corrective-action',
            'safety-report',
            'rfi',
            'daily-progress',
            'inspection-checklist',
            'toolbox-talk',
            'variation',
            'ncr',
            'delivery-docket',
            'site-instruction',              -- Legacy value (kept for backward compatibility)
            'site-instruction-issue',       -- Issue direction TO contractor
            'site-instruction-acknowledge' -- Acknowledge receipt FROM engineer/client
        )
    );

COMMENT ON CONSTRAINT site_documents_document_type_check ON site_documents IS 
    'Valid document types including split site instruction variants (issue vs acknowledge)';
