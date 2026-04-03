-- Migration: Add Toolbox Talk support to SiteCapture
-- Creates tables for attendees, actions, and adds toolbox_talk_data JSONB column

-- Table: Toolbox Talk Attendees
CREATE TABLE IF NOT EXISTS public.toolbox_talk_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES public.site_diaries(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text NOT NULL,
  trade text,
  signature_data text, -- Base64 signature image or signature reference
  signed_on_paper boolean NOT NULL DEFAULT false,
  signed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.toolbox_talk_attendees IS 'Attendees for toolbox talk records';
COMMENT ON COLUMN public.toolbox_talk_attendees.signature_data IS 'Base64 encoded signature image or reference to stored signature';
COMMENT ON COLUMN public.toolbox_talk_attendees.signed_on_paper IS 'Whether attendee signed on physical paper instead of digital';

CREATE INDEX IF NOT EXISTS idx_toolbox_talk_attendees_diary_id ON public.toolbox_talk_attendees(diary_id);

-- Table: Toolbox Talk Actions (Follow-up actions raised during the talk)
CREATE TABLE IF NOT EXISTS public.toolbox_talk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES public.site_diaries(id) ON DELETE CASCADE,
  description text NOT NULL,
  assigned_to text, -- Can be a name or reference to user
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.toolbox_talk_actions IS 'Follow-up actions raised during toolbox talks';

CREATE INDEX IF NOT EXISTS idx_toolbox_talk_actions_diary_id ON public.toolbox_talk_actions(diary_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talk_actions_status ON public.toolbox_talk_actions(status) WHERE status != 'completed';

-- Add toolbox_talk_data JSONB column for flexible storage of talk-specific data
ALTER TABLE public.site_diaries
ADD COLUMN IF NOT EXISTS toolbox_talk_data jsonb DEFAULT NULL;

COMMENT ON COLUMN public.site_diaries.toolbox_talk_data IS 
'JSON data for toolbox talk forms: { talk_date, talk_time, location, conducted_by_name, conducted_by_role, topic_title, topic_category, duration_minutes, content, attached_document_url, presenter_signature, presenter_signed_at }';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_site_diaries_toolbox_talk_data 
ON public.site_diaries USING GIN(toolbox_talk_data) 
WHERE form_type = 'toolbox-talk';

-- Update function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_toolbox_talk_attendees_updated_at ON public.toolbox_talk_attendees;
CREATE TRIGGER update_toolbox_talk_attendees_updated_at
  BEFORE UPDATE ON public.toolbox_talk_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_toolbox_talk_actions_updated_at ON public.toolbox_talk_actions;
CREATE TRIGGER update_toolbox_talk_actions_updated_at
  BEFORE UPDATE ON public.toolbox_talk_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.toolbox_talk_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolbox_talk_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for toolbox_talk_attendees
DROP POLICY IF EXISTS "Attendees viewable by company members" ON public.toolbox_talk_attendees;
CREATE POLICY "Attendees viewable by company members"
  ON public.toolbox_talk_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_attendees.diary_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Attendees insertable by company members" ON public.toolbox_talk_attendees;
CREATE POLICY "Attendees insertable by company members"
  ON public.toolbox_talk_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_attendees.diary_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Attendees updatable by company members" ON public.toolbox_talk_attendees;
CREATE POLICY "Attendees updatable by company members"
  ON public.toolbox_talk_attendees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_attendees.diary_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Attendees deletable by company members" ON public.toolbox_talk_attendees;
CREATE POLICY "Attendees deletable by company members"
  ON public.toolbox_talk_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_attendees.diary_id
      AND m.user_id = auth.uid()
    )
  );

-- RLS Policies for toolbox_talk_actions
DROP POLICY IF EXISTS "Actions viewable by company members" ON public.toolbox_talk_actions;
CREATE POLICY "Actions viewable by company members"
  ON public.toolbox_talk_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_actions.diary_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Actions insertable by company members" ON public.toolbox_talk_actions;
CREATE POLICY "Actions insertable by company members"
  ON public.toolbox_talk_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_actions.diary_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Actions updatable by company members" ON public.toolbox_talk_actions;
CREATE POLICY "Actions updatable by company members"
  ON public.toolbox_talk_actions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_actions.diary_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Actions deletable by company members" ON public.toolbox_talk_actions;
CREATE POLICY "Actions deletable by company members"
  ON public.toolbox_talk_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_diaries d
      JOIN public.company_memberships m ON m.company_id = d.company_id
      WHERE d.id = toolbox_talk_actions.diary_id
      AND m.user_id = auth.uid()
    )
  );
