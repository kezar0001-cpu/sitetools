import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SITE_SETTINGS } from "@/lib/cms/defaults";
import { CmsBlock, CmsPage, CmsSiteSettings } from "@/lib/cms/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface CmsPageRow {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  status: "draft" | "published" | "archived";
  seo_title?: string;
  seo_description?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  no_index?: boolean;
  nav_label?: string;
  nav_visible: boolean;
  footer_visible: boolean;
  page_order: number;
}

interface CmsBlockRow {
  id: string;
  block_type: CmsBlock["type"];
  title: string;
  is_visible: boolean;
  order_index: number;
  content: Record<string, unknown>;
}

function getAnonClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getAdminClient() {
  if (!supabaseUrl || !serviceRole) return null;
  return createClient(supabaseUrl, serviceRole);
}

function mapPageRow(row: CmsPageRow, blocks: CmsBlock[]): CmsPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    pageType: row.page_type,
    status: row.status,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    ogImageUrl: row.og_image_url,
    canonicalUrl: row.canonical_url,
    noIndex: row.no_index,
    navLabel: row.nav_label,
    navVisible: row.nav_visible,
    footerVisible: row.footer_visible,
    pageOrder: row.page_order,
    blocks
  };
}

export async function getPublishedPageBySlug(slug: string): Promise<CmsPage | null> {
  const client = getAnonClient();
  if (!client) return null;

  const { data: page } = await client
    .from("cms_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<CmsPageRow>();

  if (!page) return null;

  const { data: blocks } = await client
    .from("cms_page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("is_visible", true)
    .order("order_index", { ascending: true });

  const typedBlocks = (blocks ?? []).map((block) => {
    const row = block as unknown as CmsBlockRow;
    return {
      id: row.id,
      type: row.block_type,
      title: row.title,
      isVisible: row.is_visible,
      orderIndex: row.order_index,
      content: row.content
    };
  }) as CmsBlock[];

  return mapPageRow(page, typedBlocks);
}

export async function getCmsSettings(): Promise<CmsSiteSettings> {
  const client = getAnonClient();
  if (!client) return DEFAULT_SITE_SETTINGS;

  const { data } = await client
    .from("cms_site_settings")
    .select("settings_json")
    .eq("id", 1)
    .maybeSingle<{ settings_json: CmsSiteSettings }>();

  return data?.settings_json ?? DEFAULT_SITE_SETTINGS;
}
