export type ProductIntent = "sitesign" | "siteplan";

const PRODUCT_INTENTS: ProductIntent[] = ["sitesign", "siteplan"];

export function parseProductIntent(value: string | null | undefined): ProductIntent | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return PRODUCT_INTENTS.includes(normalized as ProductIntent) ? (normalized as ProductIntent) : null;
}

export function resolveProductHome(intent: ProductIntent | null | undefined): string {
  if (intent === "siteplan") return "/dashboard/planner";
  return "/dashboard/site-sign-in";
}
