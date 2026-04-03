-- Migration: Add induction_data column to site_diaries for Site Induction form type
-- Created: 2026-04-10

-- Add induction_data JSONB column to store structured site induction form data
ALTER TABLE public.site_diaries
ADD COLUMN IF NOT EXISTS induction_data jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.site_diaries.induction_data IS 'Structured JSON data for site induction forms containing worker details, hazards, site rules, emergency procedures, and signatures';

-- Update the update_modified_column trigger to handle induction_data changes
-- (The existing trigger already handles all columns via TG_OP checks)

-- Add partial index for quick filtering of induction records
CREATE INDEX IF NOT EXISTS idx_site_diaries_induction_data 
ON public.site_diaries (id) 
WHERE induction_data IS NOT NULL;

-- Add GIN index for efficient JSONB queries on induction_data
CREATE INDEX IF NOT EXISTS idx_site_diaries_induction_data_gin 
ON public.site_diaries USING GIN (induction_data);
