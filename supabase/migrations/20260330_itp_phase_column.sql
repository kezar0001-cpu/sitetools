-- Add phase column to itp_items for phase-based ITP methodology
-- Phases group sequential activities under work stages (e.g. Site Establishment, Demolish & Excavate)

alter table public.itp_items
  add column if not exists phase text;

-- Index for efficient phase grouping queries
create index if not exists idx_itp_items_phase
  on public.itp_items(session_id, phase, sort_order);
