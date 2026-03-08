import { CmsBlock, CmsBlockType } from "@/lib/cms/types";

const SLUG_PATTERN = /^(|[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

function hasValidLink(link?: string): boolean {
  if (!link) return true;
  return link.startsWith("/") || link.startsWith("http://") || link.startsWith("https://");
}

export function validateBlock(block: CmsBlock): string[] {
  const errors: string[] = [];
  if (!block.id) errors.push("Missing block id.");
  switch (block.type) {
    case "hero":
      if (!block.headline?.trim()) errors.push("Hero block requires headline.");
      if (!hasValidLink(block.primaryCtaHref) || !hasValidLink(block.secondaryCtaHref)) errors.push("Hero CTA links must be relative or http(s).");
      break;
    case "textMedia":
      if (!block.heading?.trim() || !block.body?.trim()) errors.push("Text+Media requires heading and body.");
      break;
    case "featureGrid":
      if (!block.heading?.trim()) errors.push("Feature grid requires heading.");
      if (!block.items?.length) errors.push("Feature grid requires at least one item.");
      break;
    case "productCards":
      if (!block.heading?.trim()) errors.push("Product cards requires heading.");
      if (!block.cards?.length) errors.push("Product cards requires at least one card.");
      for (const card of block.cards || []) {
        if (!hasValidLink(card.ctaHref)) errors.push("Product card CTA links must be relative or http(s).");
      }
      break;
    case "howItWorks":
      if (!block.heading?.trim() || !block.steps?.length) errors.push("How it works requires heading and steps.");
      break;
    case "faq":
      if (!block.heading?.trim() || !block.items?.length) errors.push("FAQ requires heading and questions.");
      break;
    case "cta":
      if (!block.heading?.trim() || !block.primaryCtaText?.trim() || !block.primaryCtaHref?.trim()) {
        errors.push("CTA requires heading and primary CTA.");
      }
      if (!hasValidLink(block.primaryCtaHref) || !hasValidLink(block.secondaryCtaHref)) errors.push("CTA links must be relative or http(s).");
      break;
    case "roadmapGrid":
      if (!block.heading?.trim() || !block.items?.length) errors.push("Roadmap grid requires heading and items.");
      break;
    case "demoVideo":
      if (!block.heading?.trim()) errors.push("Demo video requires heading.");
      break;
    case "richText":
      if (!block.content?.trim()) errors.push("Rich text requires content.");
      break;
    default:
      errors.push(`Unsupported block type ${(block as { type: string }).type}.`);
  }
  return errors;
}

export function validateBlocks(input: unknown): { blocks: CmsBlock[]; errors: string[] } {
  if (!Array.isArray(input)) return { blocks: [], errors: ["Blocks must be an array."] };
  const blocks = input as CmsBlock[];
  const errors = blocks.flatMap((block, i) => validateBlock(block).map((e) => `Block ${i + 1}: ${e}`));
  return { blocks, errors };
}

export function createBlockTemplate(type: CmsBlockType): CmsBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "hero":
      return { id, type, headline: "New hero headline", subheadline: "Add supporting copy", theme: "dark", align: "left" };
    case "textMedia":
      return { id, type, heading: "Section heading", body: "Section body copy", mediaSide: "right" };
    case "featureGrid":
      return { id, type, heading: "Feature grid", items: [{ title: "Feature", description: "Describe the feature" }] };
    case "productCards":
      return { id, type, heading: "Products", cards: [{ title: "Product", description: "Description", ctaText: "Learn more", ctaHref: "/" }] };
    case "howItWorks":
      return { id, type, heading: "How it works", steps: [{ title: "Step 1", description: "Describe this step" }] };
    case "faq":
      return { id, type, heading: "FAQ", items: [{ question: "Question", answer: "Answer" }] };
    case "cta":
      return { id, type, heading: "Call to action", primaryCtaText: "Get started", primaryCtaHref: "/login" };
    case "roadmapGrid":
      return { id, type, heading: "Roadmap", items: [{ title: "Module", description: "Roadmap detail", status: "coming soon" }] };
    case "demoVideo":
      return { id, type, heading: "Demo video", body: "Add context for this demo" };
    case "richText":
      return { id, type, heading: "More info", content: "Rich content section" };
  }
}
