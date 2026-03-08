import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CMS_COOKIE_NAME, getExpectedCmsSessionToken } from "@/lib/cms/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxRequestBodySize = "50mb";

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
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `Allowed types: ${allowedTypes.join(", ")}` }, { status: 400 });
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
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || "Upload failed." }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  const patch: Record<string, unknown> = {
    slot,
    type: isVideo ? "video" : "image",
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

  return NextResponse.json({ url: publicUrl, slot, kind });
}
