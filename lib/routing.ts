export type ProductIntent = "sitesign" | "siteplan";

const PRODUCT_INTENTS: ProductIntent[] = ["sitesign", "siteplan"];

export function parseProductIntent(value: string | null | undefined): ProductIntent | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return PRODUCT_INTENTS.includes(normalized as ProductIntent) ? (normalized as ProductIntent) : null;
}

/**
 * Resolves the post-login destination.
 * Default: /dashboard (Module Centre / Workspace) so users can choose their module.
 * Intent-specific: only used when arriving from a known deep-link (e.g. invite QR flow).
 */
export function resolveProductHome(intent: ProductIntent | null | undefined): string {
  if (intent === "siteplan") return "/site-plan";
  if (intent === "sitesign") return "/dashboard/site-sign-in";
  return "/dashboard";
}
