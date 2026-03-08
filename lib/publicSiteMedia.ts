export type PublicMediaSlot = {
  key: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  sourceName: string;
  sourceUrl: string;
  license: string;
  notes: string;
};

export type PublicVideoSlot = {
  key: string;
  src: string;
  poster: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  notes: string;
};

/**
 * Production media slots for the public website.
 *
 * Current sources are local brand-safe illustrations used as stable defaults.
 * Replace each `src` with approved photo/video files while keeping the same slot keys.
 */
export const PUBLIC_MEDIA_SLOTS: Record<string, PublicMediaSlot> = {
  siteSignHero: {
    key: "siteSignHero",
    src: "/branding/hero-site-team.svg",
    alt: "Civil construction supervisor running SiteSign QR attendance at a live project entry point.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#siteSignHero",
    license: "Buildstate proprietary placeholder slot",
    notes: "SiteSign product image slot for the hero media card on the right side.",
  },
  siteSignHeroCardImage: {
    key: "siteSignHeroCardImage",
    src: "/branding/hero-site-team.svg",
    alt: "Buildstate SiteSign preview card shown in the homepage hero panel.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#siteSignHeroCardImage",
    license: "Buildstate proprietary placeholder slot",
    notes: "Dedicated upload/link allocation for the hero card image (separate from hero background video).",
  },
  sitePlanWorkflow: {
    key: "sitePlanWorkflow",
    src: "/branding/hero-dashboard-summary.svg",
    alt: "Project engineer reviewing SitePlan programme and delivery tracking for civil works.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#sitePlanWorkflow",
    license: "Buildstate proprietary placeholder slot",
    notes: "Secondary visual for planning and progress workflows.",
  },
  workspaceApps: {
    key: "workspaceApps",
    src: "/branding/hero-qr-checkin.svg",
    alt: "Site team coordinating field checks, plans, and delivery tasks across connected workspace apps.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#workspaceApps",
    license: "Buildstate proprietary placeholder slot",
    notes: "Supports broader workspace apps roadmap section.",
  },
};

export const PUBLIC_VIDEO_SLOTS: Record<string, PublicVideoSlot> = {
  siteSignHeroBackground: {
    key: "siteSignHeroBackground",
    src: "https://cdn.coverr.co/videos/coverr-construction-site-at-dusk-1579/1080p.mp4",
    poster: "/branding/video-poster.svg",
    sourceName: "Coverr construction footage",
    sourceUrl: "https://coverr.co/videos/construction-site-at-dusk-1579",
    license: "Coverr license",
    notes: "Homepage hero section background video. Replace with approved hosted MP4 if needed.",
  },
};

export function getPublicMediaSlot(key: keyof typeof PUBLIC_MEDIA_SLOTS): PublicMediaSlot {
  return PUBLIC_MEDIA_SLOTS[key];
}

export function getPublicVideoSlot(key: keyof typeof PUBLIC_VIDEO_SLOTS): PublicVideoSlot {
  return PUBLIC_VIDEO_SLOTS[key];
}

export type PublicMediaSlotKey = keyof typeof PUBLIC_MEDIA_SLOTS;
export type PublicVideoSlotKey = keyof typeof PUBLIC_VIDEO_SLOTS;
export type PublicSlotKey = PublicMediaSlotKey | PublicVideoSlotKey;

export const PUBLIC_MEDIA_SLOT_KEYS = Object.keys(PUBLIC_MEDIA_SLOTS) as PublicMediaSlotKey[];
export const PUBLIC_VIDEO_SLOT_KEYS = Object.keys(PUBLIC_VIDEO_SLOTS) as PublicVideoSlotKey[];
