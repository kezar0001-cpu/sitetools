-- Migration: Add form_type to site_diaries for SiteCapture module
-- This allows site_diaries to be one form type within the broader SiteCapture system

-- Add form_type column with default 'daily-diary' for existing records
ALTER TABLE public.site_diaries 
ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'daily-diary';

-- Add comment explaining the column
COMMENT ON COLUMN public.site_diaries.form_type IS 
'The type of site capture form: daily-diary, inspection, incident-report, etc.';

-- Create index for efficient filtering by form type
CREATE INDEX IF NOT EXISTS idx_site_diaries_form_type 
ON public.site_diaries(company_id, form_type, date desc);
