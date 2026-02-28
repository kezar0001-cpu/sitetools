-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SITE LOGOS                                                                ║
-- ║  Adds optional logo URL to sites (for QR branding)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

alter table public.sites
  add column if not exists logo_url text;

