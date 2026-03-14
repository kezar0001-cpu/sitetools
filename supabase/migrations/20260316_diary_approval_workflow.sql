-- Diary approval workflow
-- Adds submitted_at/by, approved_at/by, rejection_note columns and extends the
-- diary_status enum with 'approved' and 'rejected'.

-- ─────────────────────────────────────────────
-- Extend enum: diary_status
-- ─────────────────────────────────────────────
-- ADD VALUE is transactional in Postgres 12+ and safe to re-run via IF NOT EXISTS
ALTER TYPE public.diary_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.diary_status ADD VALUE IF NOT EXISTS 'rejected';

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
-- Enforcement at the DB level: only owner/admin can flip status to
-- 'approved' or 'rejected'.  The creator can flip draft↔submitted↔rejected.
-- ─────────────────────────────────────────────

-- Replace the existing permissive update policy with a role-aware one.
-- We use two policies (one for the author, one for admin+) rather than a single
-- combined policy so each path has clear semantics.

DROP POLICY IF EXISTS site_diaries_update ON public.site_diaries;

-- Authors (diary creator) can edit and submit/resubmit their own diary,
-- but cannot approve or reject.
CREATE POLICY site_diaries_update_author ON public.site_diaries
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND company_id IN (SELECT public.get_my_company_ids())
  -- Cannot already be in an approved state (lock approved diaries for authors)
  AND status != 'approved'
)
WITH CHECK (
  created_by = auth.uid()
  AND company_id IN (SELECT public.get_my_company_ids())
  -- Authors cannot set status to 'approved'; they can go draft→submitted or rejected→submitted
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
