-- =============================================================
-- Fix itp_items slug generation trigger
--
-- The original trigger had a logically incorrect condition:
--   new.slug = substr(md5(random()::text), 1, 10)
-- Both sides call random() independently, so the comparison
-- is almost never true and the slug never gets rewritten.
--
-- This migration:
--   1. Removes the column default from itp_items.slug
--   2. Replaces the trigger function to always set slug on INSERT
--      using the item id for collision resistance
--   3. Retains the existing unique index
-- =============================================================

-- 1. Remove column default so slug arrives as NULL on insert
alter table public.itp_items alter column slug drop default;

-- 2. Replace trigger function: unconditionally set slug on INSERT
create or replace function public.itp_items_set_slug()
returns trigger as $fn$
begin
  new.slug := substr(md5(random()::text || new.id::text), 1, 10);
  return new;
end;
$fn$ language plpgsql;

-- 3. Re-create trigger (BEFORE INSERT, same name)
drop trigger if exists trg_itp_items_set_slug on public.itp_items;
create trigger trg_itp_items_set_slug
  before insert on public.itp_items
  for each row execute function public.itp_items_set_slug();

-- Unique index already exists (idx_itp_items_slug) — no changes needed.
