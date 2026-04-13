-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SiteSign — Daily Briefings & Site Inductions                              ║
-- ║  Adds toolbox-talk briefings and multi-step induction wizard to sign-in    ║
-- ║  Also adds returning-worker tracking columns to site_visits                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ─── 1. Daily Safety Briefings (Toolbox Talk at sign-in) ─────────────────────

CREATE TABLE IF NOT EXISTS public.site_daily_briefings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date         date        NOT NULL DEFAULT CURRENT_DATE,
  title        text        NOT NULL,
  content      text        NOT NULL,
  category     text        CHECK (category IN ('Safety', 'Environment', 'Quality', 'General')),
  is_active    boolean     NOT NULL DEFAULT false,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_daily_briefings ENABLE ROW LEVEL SECURITY;

-- Anon can read active briefings (needed for the public sign-in page)
CREATE POLICY "anon_read_active_briefings"
  ON public.site_daily_briefings FOR SELECT TO anon
  USING (is_active = true);

-- Authenticated company members can do full CRUD on their briefings
CREATE POLICY "auth_company_crud_briefings"
  ON public.site_daily_briefings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = site_daily_briefings.company_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = site_daily_briefings.company_id
        AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_site_daily_briefings_site_active
  ON public.site_daily_briefings (site_id, is_active)
  WHERE is_active = true;

-- ─── 2. Site Inductions (multi-step wizard for first-time visitors) ───────────

CREATE TABLE IF NOT EXISTS public.site_inductions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title        text        NOT NULL DEFAULT 'Site Induction',
  -- steps: [{ step_number, title, content, requires_acknowledgement }]
  steps        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_active    boolean     NOT NULL DEFAULT false,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_inductions ENABLE ROW LEVEL SECURITY;

-- Anon can read active inductions (needed for the public sign-in page)
CREATE POLICY "anon_read_active_inductions"
  ON public.site_inductions FOR SELECT TO anon
  USING (is_active = true);

-- Authenticated company members can do full CRUD on their inductions
CREATE POLICY "auth_company_crud_inductions"
  ON public.site_inductions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = site_inductions.company_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = site_inductions.company_id
        AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_site_inductions_site_active
  ON public.site_inductions (site_id, is_active)
  WHERE is_active = true;

-- ─── 3. Extend site_visits with briefing and induction tracking ───────────────

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS briefing_id           uuid REFERENCES public.site_daily_briefings(id),
  ADD COLUMN IF NOT EXISTS briefing_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS induction_id          uuid REFERENCES public.site_inductions(id),
  ADD COLUMN IF NOT EXISTS induction_completed   boolean NOT NULL DEFAULT false;

-- ─── 4. updated_at triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_site_daily_briefings_updated_at ON public.site_daily_briefings;
CREATE TRIGGER set_site_daily_briefings_updated_at
  BEFORE UPDATE ON public.site_daily_briefings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_site_inductions_updated_at ON public.site_inductions;
CREATE TRIGGER set_site_inductions_updated_at
  BEFORE UPDATE ON public.site_inductions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
