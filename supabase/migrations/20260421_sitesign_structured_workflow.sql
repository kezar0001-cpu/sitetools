-- SiteSign structured induction + briefing workflow

ALTER TABLE public.site_daily_briefings
  ADD COLUMN IF NOT EXISTS content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applies_to_visitor_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS presenter_name text,
  ADD COLUMN IF NOT EXISTS requires_acknowledgement boolean NOT NULL DEFAULT true;

ALTER TABLE public.site_inductions
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS applies_to_visitor_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS requires_reacceptance_on_revision boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.site_induction_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  induction_id uuid NOT NULL REFERENCES public.site_inductions(id) ON DELETE CASCADE,
  induction_revision integer NOT NULL DEFAULT 1,
  full_name text NOT NULL,
  phone_number text,
  company_name text NOT NULL,
  visitor_type text NOT NULL,
  signature text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  acknowledgement_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_induction_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_company_read_induction_completions"
  ON public.site_induction_completions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = site_induction_completions.company_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "anon_insert_induction_completions"
  ON public.site_induction_completions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "auth_insert_induction_completions"
  ON public.site_induction_completions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = site_induction_completions.company_id
        AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_site_induction_completions_site_id
  ON public.site_induction_completions(site_id, completed_at DESC);