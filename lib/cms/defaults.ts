import { CmsBlock, CmsSiteSettings } from "@/lib/cms/types";

export const DEFAULT_SITE_SETTINGS: CmsSiteSettings = {
  siteTitle: "Buildstate",
  defaultSeoTitle: "Buildstate | Civil construction workspace",
  defaultSeoDescription: "Buildstate is a connected workspace for SiteSign, SitePlan, and field delivery apps.",
  announcementText: "Live now: SiteSign and SitePlan",
  navItems: [
    { label: "SiteSign", href: "/tools/site-sign-in" },
    { label: "SitePlan", href: "/tools/planner" },
    { label: "Workspace Apps", href: "/tools" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" }
  ],
  footerColumns: [
    {
      heading: "Products",
      links: [
        { label: "SiteSign", href: "/tools/site-sign-in" },
        { label: "SitePlan", href: "/tools/planner" },
        { label: "Tools Library", href: "/free-tools" }
      ]
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Log in", href: "/login" }
      ]
    }
  ],
  socialLinks: [],
  legalText: "© Buildstate. All rights reserved."
};

export const DEFAULT_HOME_BLOCKS: CmsBlock[] = [
  {
    id: "home-hero",
    type: "hero",
    title: "Homepage Hero",
    isVisible: true,
    orderIndex: 0,
    content: {
      eyebrow: "Live now: SiteSign",
      headline: "Site attendance and workforce visibility for live civil projects.",
      subheadline: "Buildstate is a connected workspace for project engineers and supervisors.",
      primaryCta: { label: "Open SiteSign", href: "/tools/site-sign-in" },
      secondaryCta: { label: "Explore SitePlan", href: "/tools/planner" }
    }
  },
  {
    id: "home-products",
    type: "product_cards",
    title: "Core Products",
    isVisible: true,
    orderIndex: 1,
    content: {
      heading: "Core products",
      subheading: "SiteSign and SitePlan are the lead products for civil construction coordination.",
      cards: [
        { title: "SiteSign", description: "QR sign-in and live attendance records", ctaLabel: "Open SiteSign", ctaHref: "/tools/site-sign-in", status: "Live" },
        { title: "SitePlan", description: "Planning and delivery tracking for crews", ctaLabel: "Explore SitePlan", ctaHref: "/tools/planner", status: "Live" }
      ]
    }
  },
  {
    id: "home-roadmap",
    type: "roadmap_grid",
    title: "Roadmap",
    isVisible: true,
    orderIndex: 2,
    content: {
      heading: "Workspace apps roadmap",
      items: [
        { name: "Site Diaries", summary: "Daily field reporting", status: "Planned" },
        { name: "Inspections", summary: "Structured quality checks", status: "Planned" },
        { name: "Incidents", summary: "HSE event records", status: "Planned" }
      ]
    }
  },
  {
    id: "home-cta",
    type: "cta",
    title: "Homepage CTA",
    isVisible: true,
    orderIndex: 3,
    content: {
      heading: "Start with one login and one shared workspace",
      body: "Use Buildstate to connect field attendance, planning, and delivery tracking.",
      primaryCta: { label: "Create account", href: "/login?signup=1" },
      secondaryCta: { label: "Log in", href: "/login" }
    }
  }
];
