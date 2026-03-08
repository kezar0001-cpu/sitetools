import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CmsMedia, CmsPage, CmsSiteSettings } from "@/lib/cms/types";

function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getPublishedPageBySlug(slug: string): Promise<CmsPage | null> {
  const supabase = getAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("cms_pages").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as CmsPage | null) ?? null;
}

export async function getAllPages(): Promise<CmsPage[]> {
  const supabase = getAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from("cms_pages").select("*").order("page_order", { ascending: true });
  return (data as CmsPage[] | null) ?? [];
}

export async function getPageById(id: string): Promise<CmsPage | null> {
  const supabase = getAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("cms_pages").select("*").eq("id", id).maybeSingle();
  return (data as CmsPage | null) ?? null;
}

export async function savePage(page: Partial<CmsPage> & { id?: string }) {
  const supabase = getAdmin();
  if (!supabase) return { data: null, error: new Error("Supabase env vars missing") };
  if (page.id) {
    return supabase.from("cms_pages").update({ ...page, updated_at: new Date().toISOString() }).eq("id", page.id).select("*").single();
  }
  return supabase.from("cms_pages").insert(page).select("*").single();
}

export async function getSiteSettings(): Promise<CmsSiteSettings | null> {
  const supabase = getAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("cms_site_settings").select("*").limit(1).maybeSingle();
  return (data as CmsSiteSettings | null) ?? null;
}

export async function saveSiteSettings(settings: Partial<CmsSiteSettings>) {
  const supabase = getAdmin();
  if (!supabase) return { data: null, error: new Error("Supabase env vars missing") };
  const existing = await getSiteSettings();
  if (existing) {
    return supabase.from("cms_site_settings").update(settings).eq("id", existing.id).select("*").single();
  }
  return supabase.from("cms_site_settings").insert(settings).select("*").single();
}

export async function getMediaLibrary(): Promise<CmsMedia[]> {
  const supabase = getAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from("cms_media").select("*").order("created_at", { ascending: false });
  return (data as CmsMedia[] | null) ?? [];
}

export async function getMediaMap(): Promise<Record<string, CmsMedia>> {
  const media = await getMediaLibrary();
  return Object.fromEntries(media.map((item) => [item.id, item]));
}
