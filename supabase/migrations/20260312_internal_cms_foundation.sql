create table if not exists public.cms_media (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  media_type text not null check (media_type in ('image','video')),
  storage_path text not null,
  public_url text not null,
  alt_text text,
  caption text,
  poster_media_id uuid references public.cms_media(id) on delete set null,
  mime_type text,
  width integer,
  height integer,
  source_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  internal_label text,
  slug text not null unique,
  page_type text not null default 'marketing',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  og_image_media_id uuid references public.cms_media(id) on delete set null,
  canonical_url text,
  nav_visible boolean not null default false,
  nav_label text,
  page_order integer not null default 100,
  blocks jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_site_settings (
  id uuid primary key default gen_random_uuid(),
  site_title text not null default 'Buildstate',
  brand_tagline text,
  announcement_text text,
  announcement_link text,
  default_seo_title text,
  default_seo_description text,
  nav_items jsonb not null default '[]'::jsonb,
  footer_columns jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  legal_text text,
  updated_at timestamptz not null default now()
);

alter table public.cms_pages enable row level security;
alter table public.cms_media enable row level security;
alter table public.cms_site_settings enable row level security;

create policy if not exists cms_pages_public_read on public.cms_pages for select using (status = 'published');
create policy if not exists cms_media_public_read on public.cms_media for select using (true);
create policy if not exists cms_settings_public_read on public.cms_site_settings for select using (true);

insert into public.cms_site_settings (
  site_title,
  brand_tagline,
  nav_items,
  footer_columns,
  legal_text
)
select
  'Buildstate',
  'Operational workspace products for civil contractors, project engineers, and site supervisors.',
  '[{"label":"Home","href":"/"},{"label":"SiteSign","href":"/tools/site-sign-in"},{"label":"SitePlan","href":"/tools/planner"},{"label":"Workspace Apps","href":"/tools"},{"label":"Contact","href":"/contact"}]'::jsonb,
  '[{"heading":"Products","links":[{"label":"SiteSign","href":"/tools/site-sign-in"},{"label":"SitePlan","href":"/tools/planner"},{"label":"Tools Library","href":"/free-tools"}]},{"heading":"Company","links":[{"label":"About","href":"/about"},{"label":"Contact","href":"/contact"},{"label":"Log in","href":"/login"}]}]'::jsonb,
  '© Buildstate. All rights reserved.'
where not exists (select 1 from public.cms_site_settings);

insert into public.cms_pages (title, internal_label, slug, page_type, status, seo_title, seo_description, nav_visible, nav_label, page_order, published_at, blocks)
values
(
  'Homepage','Homepage','', 'marketing','published','Buildstate | Site attendance and planning workspace','Buildstate unifies SiteSign and SitePlan into a practical operations workspace.', true,'Home',1, now(),
  '[
    {"id":"home-hero","type":"hero","eyebrow":"Live now: SiteSign","headline":"Site attendance and workforce visibility for live civil projects.","subheadline":"Buildstate is a connected workspace for project engineers and supervisors.","primaryCtaText":"Open SiteSign","primaryCtaHref":"/tools/site-sign-in","secondaryCtaText":"Explore SitePlan","secondaryCtaHref":"/tools/planner","theme":"dark"},
    {"id":"home-products","type":"productCards","heading":"Core products","subheading":"SiteSign and SitePlan are the lead products.","cards":[{"title":"SiteSign","description":"QR sign-in and live attendance registers for crews.","ctaText":"Open SiteSign","ctaHref":"/tools/site-sign-in","status":"live"},{"title":"SitePlan","description":"Planning workspace for milestones, dependencies, and progress.","ctaText":"Explore SitePlan","ctaHref":"/tools/planner","status":"live"}]},
    {"id":"home-roadmap","type":"roadmapGrid","heading":"Broader workspace roadmap","items":[{"title":"Daily reports","description":"Streamlined daily reports for field-to-office communication.","status":"coming soon"},{"title":"Plant register","description":"Equipment tracking and maintenance workflows.","status":"coming soon"},{"title":"Quality inspections","description":"Digital inspections with structured evidence.","status":"coming soon"}]},
    {"id":"home-cta","type":"cta","heading":"Single login, shared workspace architecture","body":"Use one login path then route teams through module dashboards for consistent onboarding.","primaryCtaText":"Create account","primaryCtaHref":"/login?signup=1","secondaryCtaText":"Log in","secondaryCtaHref":"/login"}
  ]'::jsonb
),
(
  'SiteSign','SiteSign landing','tools/site-sign-in','product','published','SiteSign | Workforce attendance','Run fast QR sign-in and live attendance visibility for civil projects.',true,'SiteSign',2,now(),
  '[
    {"id":"ss-hero","type":"hero","eyebrow":"SiteSign","headline":"Get every worker signed in within minutes at project entry.","subheadline":"Designed for supervisors who need reliable attendance records.","primaryCtaText":"Start SiteSign","primaryCtaHref":"/login","theme":"dark"},
    {"id":"ss-how","type":"howItWorks","heading":"Attendance workflow from gate to report","steps":[{"title":"Share your site QR sign-in","description":"Workers sign in from their phone in seconds."},{"title":"Track occupancy live","description":"Supervisors instantly see active workers."},{"title":"Export attendance records","description":"Download CSV, Excel, or PDF records."}]},
    {"id":"ss-faq","type":"faq","heading":"SiteSign FAQ","items":[{"question":"Can we export attendance logs?","answer":"Yes, exports are available for payroll and compliance records."},{"question":"Do workers need an app install?","answer":"No, they sign in through a mobile web flow."}]},
    {"id":"ss-cta","type":"cta","heading":"Ready to run digital sign-in?","primaryCtaText":"Open SiteSign","primaryCtaHref":"/tools/site-sign-in"}
  ]'::jsonb
),
(
  'SitePlan','SitePlan landing','tools/planner','product','published','SitePlan | Project controls','Turn your programme into a daily delivery system for crews.',true,'SitePlan',3,now(),
  '[
    {"id":"sp-hero","type":"hero","eyebrow":"SitePlan","headline":"Turn your programme into a daily delivery system for crews.","subheadline":"Built for engineers and delivery leads.","primaryCtaText":"Open SitePlan","primaryCtaHref":"/tools/planner","theme":"dark"},
    {"id":"sp-features","type":"featureGrid","heading":"Planning control capabilities","items":[{"title":"Programme setup","description":"Create or import plans with dates and owners."},{"title":"Milestone tracking","description":"Track progress and emerging delays."},{"title":"Shared dashboards","description":"Align engineers, supervisors, and leadership."}]},
    {"id":"sp-rich","type":"richText","heading":"Integrated workspace","content":"SitePlan sits inside the same Buildstate workspace as SiteSign, so teams can coordinate planning and attendance with one login."},
    {"id":"sp-cta","type":"cta","heading":"Start planning with confidence","primaryCtaText":"Open planner","primaryCtaHref":"/dashboard/planner"}
  ]'::jsonb
)
on conflict (slug) do nothing;
