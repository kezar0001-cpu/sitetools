import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_MEDIA_SLOTS,
  PUBLIC_VIDEO_SLOTS,
  PublicMediaSlot,
  PublicMediaSlotKey,
  PublicVideoSlot,
  PublicVideoSlotKey,
} from "@/lib/publicSiteMedia";

type PublicSiteMediaRow = {
  slot: string;
  type: "image" | "video";
  src: string | null;
  poster: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  source_name: string | null;
  source_url: string | null;
  license: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type ResolvedMediaSlots = {
  mediaSlots: Record<PublicMediaSlotKey, PublicMediaSlot>;
  videoSlots: Record<PublicVideoSlotKey, PublicVideoSlot>;
};

function mergeMediaSlot(base: PublicMediaSlot, row: PublicSiteMediaRow): PublicMediaSlot {
  return {
    ...base,
    src: row.src ?? base.src,
    alt: row.alt ?? base.alt,
    width: row.width ?? base.width,
    height: row.height ?? base.height,
    sourceName: row.source_name ?? base.sourceName,
    sourceUrl: row.source_url ?? base.sourceUrl,
    license: row.license ?? base.license,
    notes: row.notes ?? base.notes,
  };
}

function mergeVideoSlot(base: PublicVideoSlot, row: PublicSiteMediaRow): PublicVideoSlot {
  return {
    ...base,
    src: row.src ?? base.src,
    poster: row.poster ?? base.poster,
    sourceName: row.source_name ?? base.sourceName,
    sourceUrl: row.source_url ?? base.sourceUrl,
    license: row.license ?? base.license,
    notes: row.notes ?? base.notes,
  };
}

const fetchEditableMediaOverridesCached = unstable_cache(
  async (): Promise<Record<string, PublicSiteMediaRow>> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("public_site_media").select("*");

    if (error || !data) {
      console.warn("[publicSiteMedia] Falling back to defaults: ", error?.message);
      return {};
    }

    return data.reduce<Record<string, PublicSiteMediaRow>>((acc, row) => {
      acc[row.slot] = row as PublicSiteMediaRow;
      return acc;
    }, {});
  },
  ["public-site-media-overrides"],
  { revalidate: 300, tags: ["public-site-media-overrides"] }
);

export async function fetchEditableMediaOverrides(): Promise<Record<string, PublicSiteMediaRow>> {
  return fetchEditableMediaOverridesCached();
}

/** Direct (uncached) query — use in CMS write paths and admin GET. */
export async function fetchEditableMediaOverridesDirect(): Promise<Record<string, PublicSiteMediaRow>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("public_site_media").select("*");
  if (error || !data) {
    console.warn("[publicSiteMedia] Direct fetch failed: ", error?.message);
    return {};
  }
  return data.reduce<Record<string, PublicSiteMediaRow>>((acc, row) => {
    acc[row.slot] = row as PublicSiteMediaRow;
    return acc;
  }, {});
}

/** Direct (uncached) resolved slots — use in CMS admin GET so it always reflects the latest save. */
export async function loadResolvedMediaSlotsDirect(): Promise<ResolvedMediaSlots> {
  const overrides = await fetchEditableMediaOverridesDirect();

  const mediaSlots = Object.keys(PUBLIC_MEDIA_SLOTS).reduce((acc, key) => {
    const typedKey = key as PublicMediaSlotKey;
    const base = PUBLIC_MEDIA_SLOTS[typedKey];
    const row = overrides[typedKey];
    acc[typedKey] = row && row.type === "image" ? mergeMediaSlot(base, row) : base;
    return acc;
  }, {} as Record<PublicMediaSlotKey, PublicMediaSlot>);

  const videoSlots = Object.keys(PUBLIC_VIDEO_SLOTS).reduce((acc, key) => {
    const typedKey = key as PublicVideoSlotKey;
    const base = PUBLIC_VIDEO_SLOTS[typedKey];
    const row = overrides[typedKey];
    acc[typedKey] = row && row.type === "video" ? mergeVideoSlot(base, row) : base;
    return acc;
  }, {} as Record<PublicVideoSlotKey, PublicVideoSlot>);

  return { mediaSlots, videoSlots };
}

/** Cache tag used by unstable_cache — import this to revalidate after writes. */
export const PUBLIC_MEDIA_CACHE_TAG = "public-site-media-overrides";

export async function loadResolvedMediaSlots(): Promise<ResolvedMediaSlots> {
  const overrides = await fetchEditableMediaOverrides();

  const mediaSlots = Object.keys(PUBLIC_MEDIA_SLOTS).reduce((acc, key) => {
    const typedKey = key as PublicMediaSlotKey;
    const base = PUBLIC_MEDIA_SLOTS[typedKey];
    const row = overrides[typedKey];
    acc[typedKey] = row && row.type === "image" ? mergeMediaSlot(base, row) : base;
    return acc;
  }, {} as Record<PublicMediaSlotKey, PublicMediaSlot>);

  const videoSlots = Object.keys(PUBLIC_VIDEO_SLOTS).reduce((acc, key) => {
    const typedKey = key as PublicVideoSlotKey;
    const base = PUBLIC_VIDEO_SLOTS[typedKey];
    const row = overrides[typedKey];
    acc[typedKey] = row && row.type === "video" ? mergeVideoSlot(base, row) : base;
    return acc;
  }, {} as Record<PublicVideoSlotKey, PublicVideoSlot>);

  return { mediaSlots, videoSlots };
}

export async function resolveMediaSlot(key: PublicMediaSlotKey): Promise<PublicMediaSlot> {
  const { mediaSlots } = await loadResolvedMediaSlots();
  return mediaSlots[key];
}

export async function resolveVideoSlot(key: PublicVideoSlotKey): Promise<PublicVideoSlot> {
  const { videoSlots } = await loadResolvedMediaSlots();
  return videoSlots[key];
}
