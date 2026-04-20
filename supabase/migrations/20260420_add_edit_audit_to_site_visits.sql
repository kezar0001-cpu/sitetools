-- Add edit audit fields to site_visits for tracking who edited a record and when
ALTER TABLE public.site_visits 
  ADD COLUMN IF NOT EXISTS edited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Add index for efficient lookups by editor
CREATE INDEX IF NOT EXISTS idx_site_visits_edited_by 
  ON public.site_visits(edited_by_user_id) 
  WHERE edited_by_user_id IS NOT NULL;

-- Add index for edited_at for sorting/filtering edited records
CREATE INDEX IF NOT EXISTS idx_site_visits_edited_at 
  ON public.site_visits(edited_at DESC) 
  WHERE edited_at IS NOT NULL;
