import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CMS_COOKIE_NAME, getExpectedCmsSessionToken } from "@/lib/cms/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "public-site-media";
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const VIDEO_TYPES = ["video/mp4"];

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

  let payload: { slot?: string; kind?: Kind; fileName?: string; contentType?: string; size?: number };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { slot, kind, fileName, contentType, size } = payload;

  if (!slot || !kind || !fileName || !contentType) {
    return NextResponse.json({ error: "slot, kind, fileName, contentType are required." }, { status: 400 });
  }

  if (typeof size === "number" && size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 50 MB." }, { status: 400 });
  }

  const isVideo = kind === "video";
  const allowedTypes = isVideo ? VIDEO_TYPES : IMAGE_TYPES;
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json({ error: `Allowed types: ${allowedTypes.join(", ")}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error: bucketErr } = await supabase.storage.getBucket(BUCKET);
  if (bucketErr) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json({ error: "Storage not configured. Create a public bucket named 'public-site-media'." }, { status: 503 });
    }
  }

  const ext = (fileName.split(".").pop() || (isVideo ? "mp4" : "png")).toLowerCase();
  const safeExt = isVideo ? (ext === "mp4" ? "mp4" : "mp4") : ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `${slot}/${kind}.${safeExt}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to create upload URL" }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl,
  });
}
