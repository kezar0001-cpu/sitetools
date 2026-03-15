-- Fix missing columns that were not yet applied to the live database.
-- Safe to run multiple times (uses IF NOT EXISTS / idempotent patterns).

-- ── 1) sites.is_active ────────────────────────────────────────────────────────
-- Added by migration 20260314 but may not have been applied.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.sites.is_active
  IS 'When false the site is archived and no longer accepts sign-ins.';

-- ── 2) site_diaries approval workflow columns ─────────────────────────────────
-- Added by migration 20260316 but may not have been applied.
ALTER TYPE public.diary_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.diary_status ADD VALUE IF NOT EXISTS 'rejected';

-- Enum ADD VALUE must be committed before the new values can be referenced.
COMMIT;
BEGIN;

ALTER TABLE public.site_diaries
  ADD COLUMN IF NOT EXISTS submitted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at    timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_note text;

CREATE INDEX IF NOT EXISTS idx_site_diaries_submitted_by
  ON public.site_diaries(submitted_by);

CREATE INDEX IF NOT EXISTS idx_site_diaries_approved_by
  ON public.site_diaries(approved_by);

-- Replace the single update policy with author + manager variants
-- (matches what 20260316 intended to set up)
DROP POLICY IF EXISTS site_diaries_update ON public.site_diaries;
DROP POLICY IF EXISTS site_diaries_update_author ON public.site_diaries;
DROP POLICY IF EXISTS site_diaries_update_manager ON public.site_diaries;

CREATE POLICY site_diaries_update_author ON public.site_diaries
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND company_id IN (SELECT public.get_my_company_ids())
  AND status != 'approved'
)
WITH CHECK (
  created_by = auth.uid()
  AND company_id IN (SELECT public.get_my_company_ids())
  AND status IN ('draft', 'submitted', 'rejected')
);

CREATE POLICY site_diaries_update_manager ON public.site_diaries
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT public.get_my_company_ids())
  AND public.has_company_role(
    company_id,
    ARRAY['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_my_company_ids())
  AND public.has_company_role(
    company_id,
    ARRAY['owner'::public.company_role, 'admin'::public.company_role, 'manager'::public.company_role]
  )
);
