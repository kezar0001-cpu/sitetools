export type CmsPageStatus = "draft" | "published" | "archived";

export type CmsBlockType =
  | "hero"
  | "text_media"
  | "feature_grid"
  | "product_cards"
  | "how_it_works"
  | "faq"
  | "cta"
  | "roadmap_grid"
  | "demo_video"
  | "rich_text";

export interface CmsLink {
  label: string;
  href: string;
}

export interface CmsBaseBlock {
  id: string;
  type: CmsBlockType;
  title: string;
  isVisible: boolean;
  orderIndex: number;
}

export interface CmsHeroBlock extends CmsBaseBlock {
  type: "hero";
  content: {
    eyebrow?: string;
    headline: string;
    subheadline?: string;
    alignment?: "left" | "center";
    primaryCta?: CmsLink;
    secondaryCta?: CmsLink;
    mediaUrl?: string;
    mediaAlt?: string;
    mediaType?: "image" | "video";
  };
}

export interface CmsTextMediaBlock extends CmsBaseBlock {
  type: "text_media";
  content: {
    heading: string;
    body: string;
    mediaUrl?: string;
    mediaAlt?: string;
    mediaType?: "image" | "video";
    reverse?: boolean;
  };
}

export interface CmsFeatureGridBlock extends CmsBaseBlock {
  type: "feature_grid";
  content: {
    heading: string;
    subheading?: string;
    features: Array<{ title: string; description: string }>;
  };
}

export interface CmsProductCardsBlock extends CmsBaseBlock {
  type: "product_cards";
  content: {
    heading: string;
    subheading?: string;
    cards: Array<{ title: string; description: string; ctaLabel: string; ctaHref: string; status?: string }>;
  };
}

export interface CmsHowItWorksBlock extends CmsBaseBlock {
  type: "how_it_works";
  content: {
    heading: string;
    intro?: string;
    steps: Array<{ title: string; description: string }>;
  };
}

export interface CmsFaqBlock extends CmsBaseBlock {
  type: "faq";
  content: {
    heading: string;
    intro?: string;
    items: Array<{ question: string; answer: string }>;
  };
}

export interface CmsCtaBlock extends CmsBaseBlock {
  type: "cta";
  content: {
    heading: string;
    body?: string;
    primaryCta: CmsLink;
    secondaryCta?: CmsLink;
  };
}

export interface CmsRoadmapGridBlock extends CmsBaseBlock {
  type: "roadmap_grid";
  content: {
    heading: string;
    items: Array<{ name: string; summary: string; status: string }>;
  };
}

export interface CmsDemoVideoBlock extends CmsBaseBlock {
  type: "demo_video";
  content: {
    heading: string;
    intro?: string;
    videoUrl: string;
    posterUrl?: string;
  };
}

export interface CmsRichTextBlock extends CmsBaseBlock {
  type: "rich_text";
  content: {
    heading?: string;
    body: string;
  };
}

export type CmsBlock =
  | CmsHeroBlock
  | CmsTextMediaBlock
  | CmsFeatureGridBlock
  | CmsProductCardsBlock
  | CmsHowItWorksBlock
  | CmsFaqBlock
  | CmsCtaBlock
  | CmsRoadmapGridBlock
  | CmsDemoVideoBlock
  | CmsRichTextBlock;

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  status: CmsPageStatus;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  navLabel?: string;
  navVisible: boolean;
  footerVisible: boolean;
  pageOrder: number;
  blocks: CmsBlock[];
}

export interface CmsSiteSettings {
  siteTitle: string;
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
  announcementText?: string;
  navItems: Array<{ label: string; href: string }>;
  footerColumns: Array<{ heading: string; links: Array<{ label: string; href: string }> }>;
  socialLinks: Array<{ label: string; href: string }>;
  legalText?: string;
}
