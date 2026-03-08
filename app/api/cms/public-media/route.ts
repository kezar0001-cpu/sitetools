import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CMS_COOKIE_NAME, getExpectedCmsSessionToken } from "@/lib/cms/constants";
import { PUBLIC_MEDIA_SLOT_KEYS, PUBLIC_VIDEO_SLOT_KEYS, PublicMediaSlotKey, PublicVideoSlotKey } from "@/lib/publicSiteMedia";
import { fetchEditableMediaOverrides, loadResolvedMediaSlots } from "@/lib/cms/publicMedia";

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

  const overrides = await fetchEditableMediaOverrides();
  const resolved = await loadResolvedMediaSlots();

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
  } catch (_err) {
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

  // Basic sanitization
  const patch: Record<string, unknown> = {
    slot,
    type: body.type,
    src: body.src ?? null,
    poster: body.poster ?? null,
    alt: body.alt ?? null,
    width: body.width ?? null,
    height: body.height ?? null,
    source_name: body.source_name ?? null,
    source_url: body.source_url ?? null,
    license: body.license ?? null,
    notes: body.notes ?? null,
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(TABLE).upsert(patch);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resolved = await loadResolvedMediaSlots();
  return NextResponse.json({
    success: true,
    mediaSlots: resolved.mediaSlots,
    videoSlots: resolved.videoSlots,
  });
}
