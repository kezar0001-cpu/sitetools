-- Buildstate: Projects as Parent Entity
-- Sites now belong to a project (project_id FK on sites).
-- The old projects.site_id (one site per project) is dropped.
-- Planner, site-sign-in, and RLS are unaffected.

-- ── 1) Add project_id to sites ──────────────────────────────────────────────
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- ── 2) Backfill: where a project previously had a site_id, stamp that site
--       with project_id so no data is lost ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'projects'
      AND column_name  = 'site_id'
  ) THEN
    UPDATE public.sites s
    SET project_id = p.id
    FROM public.projects p
    WHERE p.site_id = s.id
      AND s.project_id IS NULL;
  END IF;
END $$;

-- ── 3) Drop the old site_id column from projects ─────────────────────────────
--       (direction was wrong — a project can have many sites)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'projects'
      AND column_name  = 'site_id'
  ) THEN
    -- Drop the FK constraint first if it exists
    ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_site_id_fkey;
    ALTER TABLE public.projects DROP COLUMN site_id;
  END IF;
END $$;

-- ── 4) Add project description column if missing ────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description text;

-- ── 5) Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_project ON public.sites(project_id);

-- Update the existing index that referenced (company_id, site_id) on projects
-- (the old index name was idx_projects_company_site — drop & recreate without site_id)
DROP INDEX IF EXISTS idx_projects_company_site;
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_status ON public.projects(company_id, status);

-- ── 6) RLS — projects table ──────────────────────────────────────────────────
--       Add read/write policies if not already present.
--       (companies + sites RLS already set in 20260308 migration)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_select'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY projects_select ON public.projects
      FOR SELECT TO authenticated
      USING (company_id IN (SELECT public.get_my_company_ids()));
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_insert'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY projects_insert ON public.projects
      FOR INSERT TO authenticated
      WITH CHECK (
        public.has_company_role(
          company_id,
          ARRAY['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role]
        )
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_update'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY projects_update ON public.projects
      FOR UPDATE TO authenticated
      USING (
        public.has_company_role(
          company_id,
          ARRAY['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role]
        )
      )
      WITH CHECK (
        public.has_company_role(
          company_id,
          ARRAY['owner'::public.company_role,'admin'::public.company_role,'manager'::public.company_role]
        )
      );
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_delete'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY projects_delete ON public.projects
      FOR DELETE TO authenticated
      USING (
        public.has_company_role(
          company_id,
          ARRAY['owner'::public.company_role,'admin'::public.company_role]
        )
      );
    $pol$;
  END IF;
END $$;

-- ── 7) Helper function: fetch sites for a project ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_project_site_count(p_project_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.sites s WHERE s.project_id = p_project_id;
$$;

-- ── 8) Updated trigger: stamp project_id on site_visits when possible ────────
--       (existing trigger syncs company_id; extend to also sync project_id)
CREATE OR REPLACE FUNCTION public.sync_site_visit_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_project_id  uuid;
BEGIN
  IF new.site_id IS NULL THEN
    RETURN new;
  END IF;

  SELECT s.company_id, s.project_id
  INTO v_company_id, v_project_id
  FROM public.sites s
  WHERE s.id = new.site_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Site is missing company assignment';
  END IF;

  IF new.company_id IS NULL THEN
    new.company_id := v_company_id;
  ELSIF new.company_id <> v_company_id THEN
    RAISE EXCEPTION 'Site and company mismatch on site_visits';
  END IF;

  -- Stamp project_id if the column exists and visit doesn't already have one
  IF new.project_id IS NULL AND v_project_id IS NOT NULL THEN
    new.project_id := v_project_id;
  END IF;

  IF new.created_by_user_id IS NULL THEN
    new.created_by_user_id := auth.uid();
  END IF;
  IF new.signed_in_by_user_id IS NULL THEN
    new.signed_in_by_user_id := auth.uid();
  END IF;

  RETURN new;
END;
$$;
