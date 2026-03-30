-- ---------------------------------------------------------------------------
-- itp_item_signoffs
-- Stores individual sign-off records for ITP items.
-- Multiple people (superintendent, third party, designer, etc.) can sign the
-- same item. The parent itp_items.status transitions to 'signed' on the first
-- sign-off and stays there; subsequent sign-offs are additional records here.
-- ---------------------------------------------------------------------------

CREATE TABLE itp_item_signoffs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        uuid        NOT NULL REFERENCES itp_items(id) ON DELETE CASCADE,
  session_id     uuid        NOT NULL REFERENCES itp_sessions(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  role           text        NOT NULL CHECK (role IN (
                               'superintendent',
                               'third_party',
                               'contractor',
                               'designer',
                               'inspector'
                             )),
  signed_at      timestamptz NOT NULL DEFAULT now(),
  -- Supabase Storage path: {session_id}/{item_id}/{id}.png
  -- NULL when no signature was drawn (e.g. waiver records if extended later)
  signature_path text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itp_item_signoffs_item    ON itp_item_signoffs(item_id);
CREATE INDEX idx_itp_item_signoffs_session ON itp_item_signoffs(session_id);

-- RLS: public inserts (sign-off page has no auth), authenticated reads
ALTER TABLE itp_item_signoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a sign-off"
  ON itp_item_signoffs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read sign-offs"
  ON itp_item_signoffs FOR SELECT
  USING (true);
