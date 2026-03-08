export type CmsPageStatus = "draft" | "published" | "archived";

export type CmsBlockType =
  | "hero"
  | "textMedia"
  | "featureGrid"
  | "productCards"
  | "howItWorks"
  | "faq"
  | "cta"
  | "roadmapGrid"
  | "demoVideo"
  | "richText";

export interface CmsBlockBase {
  id: string;
  type: CmsBlockType;
  hidden?: boolean;
}

export interface HeroBlock extends CmsBlockBase {
  type: "hero";
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  mediaId?: string;
  align?: "left" | "center";
  theme?: "dark" | "light";
}

export interface TextMediaBlock extends CmsBlockBase {
  type: "textMedia";
  heading: string;
  body: string;
  mediaId?: string;
  mediaSide?: "left" | "right";
}

export interface FeatureGridBlock extends CmsBlockBase {
  type: "featureGrid";
  heading: string;
  subheading?: string;
  items: Array<{ title: string; description: string }>;
}

export interface ProductCardsBlock extends CmsBlockBase {
  type: "productCards";
  heading: string;
  subheading?: string;
  cards: Array<{
    title: string;
    description: string;
    ctaText?: string;
    ctaHref?: string;
    status?: string;
    mediaId?: string;
  }>;
}

export interface HowItWorksBlock extends CmsBlockBase {
  type: "howItWorks";
  heading: string;
  intro?: string;
  steps: Array<{ title: string; description: string }>;
}

export interface FaqBlock extends CmsBlockBase {
  type: "faq";
  heading: string;
  intro?: string;
  items: Array<{ question: string; answer: string }>;
}

export interface CtaBlock extends CmsBlockBase {
  type: "cta";
  heading: string;
  body?: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

export interface RoadmapGridBlock extends CmsBlockBase {
  type: "roadmapGrid";
  heading: string;
  items: Array<{ title: string; description: string; status?: string }>;
}

export interface DemoVideoBlock extends CmsBlockBase {
  type: "demoVideo";
  heading: string;
  body?: string;
  videoMediaId?: string;
  posterMediaId?: string;
}

export interface RichTextBlock extends CmsBlockBase {
  type: "richText";
  heading?: string;
  content: string;
}

export type CmsBlock =
  | HeroBlock
  | TextMediaBlock
  | FeatureGridBlock
  | ProductCardsBlock
  | HowItWorksBlock
  | FaqBlock
  | CtaBlock
  | RoadmapGridBlock
  | DemoVideoBlock
  | RichTextBlock;

export interface CmsPage {
  id: string;
  title: string;
  internal_label: string | null;
  slug: string;
  page_type: string;
  status: CmsPageStatus;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_media_id: string | null;
  canonical_url: string | null;
  nav_visible: boolean;
  nav_label: string | null;
  page_order: number;
  blocks: CmsBlock[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsMedia {
  id: string;
  label: string;
  media_type: "image" | "video";
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  caption: string | null;
  poster_media_id: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
}

export interface CmsSiteSettings {
  id: string;
  site_title: string;
  brand_tagline: string | null;
  announcement_text: string | null;
  announcement_link: string | null;
  default_seo_title: string | null;
  default_seo_description: string | null;
  nav_items: Array<{ label: string; href: string }>;
  footer_columns: Array<{ heading: string; links: Array<{ label: string; href: string }> }>;
  social_links: Array<{ label: string; href: string }>;
  legal_text: string | null;
}
