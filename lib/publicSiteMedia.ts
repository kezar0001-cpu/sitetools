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
    notes: "Primary homepage hero slot. Replace with approved project attendance photo or 6-10s loop video poster.",
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

export function getPublicMediaSlot(key: keyof typeof PUBLIC_MEDIA_SLOTS): PublicMediaSlot {
  return PUBLIC_MEDIA_SLOTS[key];
}
