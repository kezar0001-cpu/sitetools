import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { CMS_COOKIE_NAME, getExpectedCmsSessionToken } from "@/lib/cms/constants";
import { PUBLIC_MEDIA_CACHE_TAG } from "@/lib/cms/publicMedia";
import { PUBLIC_VIDEO_SLOT_KEYS } from "@/lib/publicSiteMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "public-site-media";
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
// iOS/Safari reports .mp4 files as video/quicktime; accept both and any video/* as a fallback
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-m4v", "video/mov"];

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

type Kind = "image" | "poster" | "video";

export async function POST(request: NextRequest) {
  const auth = assertCms(request);
  if (auth) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const slot = formData.get("slot") as string | null;
  const kind = formData.get("kind") as Kind | null;
  const file = formData.get("file") as File | null;

  if (!slot || !kind || !file || !(file instanceof File)) {
    return NextResponse.json({ error: "slot, kind, and file are required." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 50 MB." }, { status: 400 });
  }

  const isVideo = kind === "video";
  const allowedTypes = isVideo ? VIDEO_TYPES : IMAGE_TYPES;
  // For video we also allow any video/* type since browsers/devices can report
  // the same file under different subtypes (e.g. iOS reports mp4 as video/quicktime)
  const typeOk = isVideo
    ? allowedTypes.includes(file.type) || file.type.startsWith("video/")
    : allowedTypes.includes(file.type);
  if (!typeOk) {
    return NextResponse.json(
      { error: isVideo ? "Upload an MP4 video file." : "Upload a PNG, JPG, WebP, or SVG image." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Ensure bucket exists
  const { error: bucketErr } = await supabase.storage.getBucket(BUCKET);
  if (bucketErr) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json({ error: "Storage not configured. Create a public bucket named 'public-site-media'." }, { status: 503 });
    }
  }

  const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "png")).toLowerCase();
  const safeExt = isVideo ? (ext === "mp4" ? "mp4" : "mp4") : ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `${slot}/${kind}.${safeExt}`;

  const buf = Buffer.from(await file.arrayBuffer());
  // Always store video as video/mp4 regardless of what the browser reported
  // (iOS sends video/quicktime even for .mp4 files; storing with the wrong
  // content-type causes playback failures when the file is served back).
  const storedContentType = isVideo ? "video/mp4" : file.type;
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: storedContentType,
    upsert: true,
  });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || "Supabase upload failed. Check bucket permissions." }, { status: 500 });
  }

  // Append a version timestamp so every upload produces a unique URL.
  // Without this, the Supabase CDN serves the old cached image when the
  // storage file is overwritten at the same path (same URL = cache hit).
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;

  // Determine slot type from the slot definition, not from the upload kind.
  // A poster upload (kind === "poster") is part of a video slot — setting
  // type: "image" here would corrupt the DB record and cause the video
  // override to be silently ignored by loadResolvedMediaSlots.
  const slotIsVideo = (PUBLIC_VIDEO_SLOT_KEYS as string[]).includes(slot);
  const patch: Record<string, unknown> = {
    slot,
    type: slotIsVideo ? "video" : "image",
  };
  if (isVideo) {
    patch.src = publicUrl;
  } else if (kind === "poster") {
    patch.poster = publicUrl;
  } else {
    patch.src = publicUrl;
  }

  const { error: upsertErr } = await supabase.from("public_site_media").upsert(patch);
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // Bust the public-site cache so the live site reflects the new file immediately.
  revalidateTag(PUBLIC_MEDIA_CACHE_TAG);

  return NextResponse.json({ url: publicUrl, slot, kind });
}
