import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { CMS_COOKIE_NAME, getExpectedCmsSessionToken } from "@/lib/cms/constants";
import { PUBLIC_MEDIA_SLOT_KEYS, PUBLIC_VIDEO_SLOT_KEYS, PublicMediaSlotKey, PublicVideoSlotKey } from "@/lib/publicSiteMedia";
import {
  fetchEditableMediaOverridesDirect,
  loadResolvedMediaSlotsDirect,
  PUBLIC_MEDIA_CACHE_TAG,
} from "@/lib/cms/publicMedia";

const TABLE = "public_site_media";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function assertCms(request: NextRequest) {
  const token = request.cookies.get(CMS_COOKIE_NAME)?.value;
  const expected = getExpectedCmsSessionToken();
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type UpsertPayload = {
  slot: string;
  type: "image" | "video";
  src?: string | null;
  poster?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  source_name?: string | null;
  source_url?: string | null;
  license?: string | null;
  notes?: string | null;
};

function isMediaSlot(slot: string): slot is PublicMediaSlotKey {
  return (PUBLIC_MEDIA_SLOT_KEYS as string[]).includes(slot);
}

function isVideoSlot(slot: string): slot is PublicVideoSlotKey {
  return (PUBLIC_VIDEO_SLOT_KEYS as string[]).includes(slot);
}

export async function GET(request: NextRequest) {
  const auth = assertCms(request);
  if (auth) return auth;

  // Always fetch fresh data for the CMS — no cache here.
  const overrides = await fetchEditableMediaOverridesDirect();
  const resolved = await loadResolvedMediaSlotsDirect();

  return NextResponse.json({
    mediaSlots: resolved.mediaSlots,
    videoSlots: resolved.videoSlots,
    overrides,
  });
}

export async function PUT(request: NextRequest) {
  const auth = assertCms(request);
  if (auth) return auth;

  let body: UpsertPayload;
  try {
    body = (await request.json()) as UpsertPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.slot || !body.type) {
    return NextResponse.json({ error: "slot and type are required." }, { status: 400 });
  }

  const slot = body.slot;
  const isImage = body.type === "image";
  if (isImage && !isMediaSlot(slot)) {
    return NextResponse.json({ error: "Unknown image slot." }, { status: 400 });
  }
  if (!isImage && !isVideoSlot(slot)) {
    return NextResponse.json({ error: "Unknown video slot." }, { status: 400 });
  }

  // Only include fields that were explicitly sent — omitting a field leaves its
  // existing DB value intact.  Previously every PUT nulled out every metadata
  // column it didn't receive, e.g. clearing the poster when saving just the
  // video URL.
  const patch: Record<string, unknown> = { slot, type: body.type };
  if (body.src !== undefined) patch.src = body.src ?? null;
  if (body.poster !== undefined) patch.poster = body.poster ?? null;
  if (body.alt !== undefined) patch.alt = body.alt ?? null;
  if (body.width !== undefined) patch.width = body.width ?? null;
  if (body.height !== undefined) patch.height = body.height ?? null;
  if (body.source_name !== undefined) patch.source_name = body.source_name ?? null;
  if (body.source_url !== undefined) patch.source_url = body.source_url ?? null;
  if (body.license !== undefined) patch.license = body.license ?? null;
  if (body.notes !== undefined) patch.notes = body.notes ?? null;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(TABLE).upsert(patch);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bust the public-site cache so the live site picks up the change immediately.
  revalidateTag(PUBLIC_MEDIA_CACHE_TAG);

  const resolved = await loadResolvedMediaSlotsDirect();
  return NextResponse.json({
    success: true,
    mediaSlots: resolved.mediaSlots,
    videoSlots: resolved.videoSlots,
  });
}
