-- ============================================================================
-- Public site media slots for homepage hero assets
-- Run in Supabase SQL editor before deploying CMS media management
-- ============================================================================

create table if not exists public.public_site_media (
  slot text primary key,
  type text not null check (type in ('image', 'video')),
  src text,
  poster text,
  alt text,
  width integer,
  height integer,
  source_name text,
  source_url text,
  license text,
  notes text,
  updated_by text,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.public_site_media is 'Editable media slots for public buildstate site (hero video + hero card image, etc).';

create or replace function public.touch_public_site_media()
returns trigger language plpgsql as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_public_site_media on public.public_site_media;
create trigger trg_touch_public_site_media
  before update on public.public_site_media
  for each row execute procedure public.touch_public_site_media();

-- Seed defaults (safe upsert so repeated runs keep the latest data)
insert into public.public_site_media (slot, type, src, poster, alt, width, height, source_name, source_url, license, notes)
values
  (
    'siteSignHeroCardImage',
    'image',
    '/branding/hero-site-team.svg',
    null,
    'Buildstate SiteSign preview card shown in the homepage hero panel.',
    1400,
    900,
    'Buildstate in-house media slot',
    'docs/public-site-media-sources.md#siteSignHeroCardImage',
    'Buildstate proprietary placeholder slot',
    'Dedicated upload/link allocation for the hero card image (separate from hero background video).'
  ),
  (
    'siteSignHeroBackground',
    'video',
    'https://cdn.coverr.co/videos/coverr-construction-site-at-dusk-1579/1080p.mp4',
    '/branding/video-poster.svg',
    'Construction site video poster showing field operations backdrop.',
    null,
    null,
    'Coverr construction footage',
    'https://coverr.co/videos/construction-site-at-dusk-1579',
    'Coverr license',
    'Homepage hero section background video. Replace with approved hosted MP4 if needed.'
  )
on conflict (slot) do update set
  type = excluded.type,
  src = excluded.src,
  poster = excluded.poster,
  alt = excluded.alt,
  width = excluded.width,
  height = excluded.height,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  license = excluded.license,
  notes = excluded.notes;
