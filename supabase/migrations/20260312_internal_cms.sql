create extension if not exists pgcrypto;

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  page_type text not null default 'marketing',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  og_image_url text,
  canonical_url text,
  no_index boolean not null default false,
  nav_label text,
  nav_visible boolean not null default false,
  footer_visible boolean not null default false,
  page_order integer not null default 0,
  published_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  block_type text not null,
  title text not null,
  is_visible boolean not null default true,
  order_index integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  media_type text not null check (media_type in ('image','video')),
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  alt_text text,
  caption text,
  source_note text,
  poster_asset_id uuid references public.cms_media_assets(id) on delete set null,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_site_settings (
  id integer primary key default 1,
  settings_json jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint cms_site_settings_singleton check (id = 1)
);

alter table public.cms_pages enable row level security;
alter table public.cms_page_blocks enable row level security;
alter table public.cms_media_assets enable row level security;
alter table public.cms_site_settings enable row level security;

create policy "published cms pages readable" on public.cms_pages
for select using (status = 'published');

create policy "published cms blocks readable" on public.cms_page_blocks
for select using (
  exists (
    select 1 from public.cms_pages p where p.id = page_id and p.status = 'published'
  )
);

create policy "public cms settings readable" on public.cms_site_settings
for select using (true);

insert into public.cms_site_settings (id, settings_json)
values (
  1,
  '{
    "siteTitle": "Buildstate",
    "defaultSeoTitle": "Buildstate | Civil construction workspace",
    "defaultSeoDescription": "Buildstate is a connected workspace for SiteSign, SitePlan, and field delivery apps.",
    "announcementText": "Live now: SiteSign and SitePlan",
    "navItems": [
      {"label": "SiteSign", "href": "/tools/site-sign-in"},
      {"label": "SitePlan", "href": "/tools/planner"},
      {"label": "Workspace Apps", "href": "/tools"},
      {"label": "About", "href": "/about"},
      {"label": "Contact", "href": "/contact"}
    ],
    "footerColumns": [
      {"heading": "Products", "links": [{"label": "SiteSign", "href": "/tools/site-sign-in"}, {"label": "SitePlan", "href": "/tools/planner"}, {"label": "Tools Library", "href": "/free-tools"}]},
      {"heading": "Company", "links": [{"label": "About", "href": "/about"}, {"label": "Contact", "href": "/contact"}, {"label": "Log in", "href": "/login"}]}
    ],
    "socialLinks": [],
    "legalText": "© Buildstate. All rights reserved."
  }'::jsonb
)
on conflict (id) do update set settings_json = excluded.settings_json;

with inserted_pages as (
  insert into public.cms_pages (title, slug, page_type, status, seo_title, seo_description, nav_visible, footer_visible, page_order)
  values
    ('Homepage', 'home', 'marketing', 'published', 'Buildstate | Civil construction workspace', 'Buildstate workspace for site attendance and planning.', true, true, 1),
    ('SiteSign Product Page', 'sitesign', 'product', 'published', 'SiteSign | Workforce attendance', 'QR sign-in and attendance records for live sites.', true, true, 2),
    ('SitePlan Product Page', 'siteplan', 'product', 'published', 'SitePlan | Planning and controls', 'Plan, track, and coordinate delivery milestones.', true, true, 3)
  on conflict (slug) do update set title = excluded.title
  returning id, slug
)
insert into public.cms_page_blocks (page_id, block_type, title, is_visible, order_index, content)
select id,
       block_type,
       title,
       true,
       order_index,
       content::jsonb
from (
  values
    ('home', 'hero', 'Homepage hero', 0, '{"eyebrow":"Live now: SiteSign","headline":"Site attendance and workforce visibility for live civil projects.","subheadline":"Buildstate is a connected workspace for project engineers and supervisors.","primaryCta":{"label":"Open SiteSign","href":"/tools/site-sign-in"},"secondaryCta":{"label":"Explore SitePlan","href":"/tools/planner"}}'),
    ('home', 'product_cards', 'Core products', 1, '{"heading":"Core products","subheading":"SiteSign and SitePlan are the lead products.","cards":[{"title":"SiteSign","description":"QR sign-in and live attendance records","ctaLabel":"Open SiteSign","ctaHref":"/tools/site-sign-in","status":"Live"},{"title":"SitePlan","description":"Planning and delivery tracking for crews","ctaLabel":"Explore SitePlan","ctaHref":"/tools/planner","status":"Live"}]}'),
    ('home', 'roadmap_grid', 'Roadmap', 2, '{"heading":"Workspace apps roadmap","items":[{"name":"Site Diaries","summary":"Daily field reporting","status":"planned"},{"name":"Inspections","summary":"Structured quality checks","status":"planned"},{"name":"Incidents","summary":"HSE event records","status":"planned"}]}'),
    ('home', 'cta', 'Homepage CTA', 3, '{"heading":"Start with one login and one shared workspace","body":"Use Buildstate to connect field attendance, planning, and delivery tracking.","primaryCta":{"label":"Create account","href":"/login?signup=1"},"secondaryCta":{"label":"Log in","href":"/login"}}'),

    ('sitesign', 'hero', 'SiteSign hero', 0, '{"eyebrow":"SiteSign","headline":"Get every worker signed in within minutes at project entry.","subheadline":"Designed for supervisors who need reliable attendance records.","primaryCta":{"label":"Start SiteSign","href":"/login?signup=1"},"secondaryCta":{"label":"Open SiteSign","href":"/tools/site-sign-in"}}'),
    ('sitesign', 'how_it_works', 'SiteSign workflow', 1, '{"heading":"Attendance workflow","steps":[{"title":"Share QR sign-in","description":"Place a QR at each access point."},{"title":"Track occupancy","description":"See active workers and follow-up gaps."},{"title":"Export records","description":"Download CSV, Excel, or PDF records."}]}'),
    ('sitesign', 'faq', 'SiteSign FAQ', 2, '{"heading":"SiteSign FAQ","items":[{"question":"Can this replace paper registers?","answer":"Yes, teams can use QR-based digital sign-ins."},{"question":"Can we export attendance?","answer":"Yes, export attendance in CSV and PDF formats."}]}'),

    ('siteplan', 'hero', 'SitePlan hero', 0, '{"eyebrow":"SitePlan","headline":"Turn your programme into a daily delivery system for crews.","subheadline":"SitePlan keeps your baseline, progress, and milestones connected.","primaryCta":{"label":"Start SitePlan","href":"/login?signup=1"},"secondaryCta":{"label":"Open SitePlan","href":"/tools/planner"}}'),
    ('siteplan', 'feature_grid', 'SitePlan features', 1, '{"heading":"Planning control features","features":[{"title":"Baseline plans","description":"Build and maintain a shared programme baseline."},{"title":"Progress tracking","description":"Track planned vs actual progress with clear status."},{"title":"Team visibility","description":"Keep crews and PMs aligned on milestones."}]}'),
    ('siteplan', 'cta', 'SitePlan CTA', 2, '{"heading":"Coordinate planning with your field teams","body":"Bring all updates into one workspace with SitePlan.","primaryCta":{"label":"Create account","href":"/login?signup=1"},"secondaryCta":{"label":"Explore planner","href":"/tools/planner"}}')
) as seed(slug, block_type, title, order_index, content)
join inserted_pages p on p.slug = seed.slug;
