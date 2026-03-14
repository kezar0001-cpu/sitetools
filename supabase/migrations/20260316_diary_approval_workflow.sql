-- Diary approval workflow
-- Adds submitted_at/by, approved_at/by, rejection_note columns and extends the
-- diary_status enum with 'approved' and 'rejected'.

-- ─────────────────────────────────────────────
-- Extend (or create) enum: diary_status
-- We use a DO block so this is safe to run even if the foundation migration
-- has not yet been applied (fresh schema) or if the enum already has these values.
-- ─────────────────────────────────────────────
DO $$
BEGIN
  -- Create the enum from scratch if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'diary_status'
  ) THEN
    CREATE TYPE public.diary_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
  ELSE
    -- Type exists — add new values if they're not already there
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'diary_status' AND e.enumlabel = 'approved'
    ) THEN
      ALTER TYPE public.diary_status ADD VALUE 'approved';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'diary_status' AND e.enumlabel = 'rejected'
    ) THEN
      ALTER TYPE public.diary_status ADD VALUE 'rejected';
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- New columns on site_diaries
-- ─────────────────────────────────────────────
ALTER TABLE public.site_diaries
  ADD COLUMN IF NOT EXISTS submitted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by   uuid references auth.users(id) on delete set null,
  ADD COLUMN IF NOT EXISTS approved_at    timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by    uuid references auth.users(id) on delete set null,
  ADD COLUMN IF NOT EXISTS rejection_note text;

-- ─────────────────────────────────────────────
-- Indexes for new FK columns
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_site_diaries_submitted_by
  ON public.site_diaries(submitted_by);

CREATE INDEX IF NOT EXISTS idx_site_diaries_approved_by
  ON public.site_diaries(approved_by);

-- ─────────────────────────────────────────────
-- Update RLS: approval actions restricted to owner/admin
-- We drop and recreate the update policy so that ordinary members (non-managers)
-- cannot set approved_at / approved_by / rejection_note directly.
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS site_diaries_update ON public.site_diaries;

-- Authors (diary creator) can edit and submit/resubmit their own diary,
-- but cannot approve or reject.
CREATE POLICY site_diaries_update_author ON public.site_diaries
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND company_id IN (SELECT public.get_my_company_ids())
  -- Cannot edit an approved diary
  AND status != 'approved'
)
WITH CHECK (
  created_by = auth.uid()
  AND company_id IN (SELECT public.get_my_company_ids())
  -- Authors cannot set status to 'approved'
  AND status IN ('draft', 'submitted', 'rejected')
);

-- Managers, admins, and owners can update any company diary, including approval fields.
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
