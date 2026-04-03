-- Migration: Add status column to site_documents table
-- Created: 2026-04-03

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'site_documents' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE site_documents 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'shared', 'finalised'));
    END IF;
END $$;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_site_documents_status ON site_documents(status);

-- Update existing records to have 'draft' status if null
UPDATE site_documents 
SET status = 'draft' 
WHERE status IS NULL;
