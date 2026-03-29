-- =============================================================
-- SiteITP — Add structured ITP fields for industry compliance
-- Adds: review type, reference_standard, responsibility,
--        records_required, acceptance_criteria
-- Aligns with Australian civil construction ITP methodology
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. Add 'review' to the type check constraint
-- ─────────────────────────────────────────────
alter table public.itp_items drop constraint if exists itp_items_type_check;
alter table public.itp_items
  add constraint itp_items_type_check
  check (type in ('hold', 'witness', 'review'));

-- ─────────────────────────────────────────────
-- 2. Add structured columns
-- ─────────────────────────────────────────────
alter table public.itp_items
  add column if not exists reference_standard text,
  add column if not exists responsibility text
    default 'contractor'
    check (responsibility in ('contractor', 'superintendent', 'third_party')),
  add column if not exists records_required text,
  add column if not exists acceptance_criteria text;

-- ─────────────────────────────────────────────
-- 3. Backfill: copy description into acceptance_criteria
--    for existing rows that have no acceptance_criteria yet
-- ─────────────────────────────────────────────
update public.itp_items
  set acceptance_criteria = description
  where acceptance_criteria is null
    and description is not null
    and description <> '';
