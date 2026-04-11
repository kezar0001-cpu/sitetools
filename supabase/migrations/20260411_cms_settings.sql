-- CMS settings key-value store.
-- Used by the /cms/recover tool to persist admin credentials without
-- requiring a server restart or filesystem write access.
-- Access is intentionally restricted to the service role only.

create table if not exists public.cms_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- RLS on, but no policies — only the service-role key can read/write.
alter table public.cms_settings enable row level security;

comment on table public.cms_settings is
  'Key-value store for CMS admin configuration (e.g. credentials). '
  'Accessible only via the Supabase service-role key.';
