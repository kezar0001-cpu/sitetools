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
  siteCaptureWorkflow: {
    key: "siteCaptureWorkflow",
    src: "/branding/hero-dashboard-summary.svg",
    alt: "SiteCapture workflow summary showing daily diaries, field notes, and export-ready records.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#siteCaptureWorkflow",
    license: "Buildstate proprietary placeholder slot",
    notes: "Primary media slot for SiteCapture public module and workflow storytelling.",
  },
  siteItpWorkflow: {
    key: "siteItpWorkflow",
    src: "/branding/hero-dashboard-summary.svg",
    alt: "Site ITP workflow board with hold points, witness checks, and sign-off progress.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#siteItpWorkflow",
    license: "Buildstate proprietary placeholder slot",
    notes: "Primary media slot for Site ITP public module visuals.",
  },
  siteDocsWorkflow: {
    key: "siteDocsWorkflow",
    src: "/branding/hero-dashboard-summary.svg",
    alt: "Site Docs workflow showing controlled revisions, approvals, and issue-ready document outputs.",
    width: 1400,
    height: 900,
    sourceName: "Buildstate in-house media slot",
    sourceUrl: "docs/public-site-media-sources.md#siteDocsWorkflow",
    license: "Buildstate proprietary placeholder slot",
    notes: "Primary media slot for Site Docs public module and document control messaging.",
  },
  // ── Client logo slots ───────────────────────────────────────────────────────
  // Managed via the CMS admin → Client Logos section.
  // sourceName = company display name, sourceUrl = company website (optional).
  // Slots with empty sourceName and src are hidden on the landing page.
  clientLogo1: { key: "clientLogo1", src: "", alt: "", width: 200, height: 80, sourceName: "", sourceUrl: "", license: "", notes: "Client logo slot 1." },
  clientLogo2: { key: "clientLogo2", src: "", alt: "", width: 200, height: 80, sourceName: "", sourceUrl: "", license: "", notes: "Client logo slot 2." },
  clientLogo3: { key: "clientLogo3", src: "", alt: "", width: 200, height: 80, sourceName: "", sourceUrl: "", license: "", notes: "Client logo slot 3." },
  clientLogo4: { key: "clientLogo4", src: "", alt: "", width: 200, height: 80, sourceName: "", sourceUrl: "", license: "", notes: "Client logo slot 4." },
  clientLogo5: { key: "clientLogo5", src: "", alt: "", width: 200, height: 80, sourceName: "", sourceUrl: "", license: "", notes: "Client logo slot 5." },
  clientLogo6: { key: "clientLogo6", src: "", alt: "", width: 200, height: 80, sourceName: "", sourceUrl: "", license: "", notes: "Client logo slot 6." },
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
