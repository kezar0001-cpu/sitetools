import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BUCKET = "site-logos";
const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !caller) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const siteId = formData.get("site_id") as string | null;
  const file = formData.get("file") as File | null;
  if (!siteId || !file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing site_id or file." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File must be under ${MAX_SIZE_MB} MB.` }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Allowed types: PNG, JPEG, WebP, SVG." }, { status: 400 });
  }

  const { data: site, error: siteErr } = await supabaseAdmin
    .from("sites")
    .select("id, org_id")
    .eq("id", siteId)
    .single();

  if (siteErr || !site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", site.org_id)
    .eq("user_id", caller.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can upload a site logo." }, { status: 403 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `${siteId}.${safeExt}`;

  const { error: bucketErr } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (bucketErr) {
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json(
        { error: "Storage not configured. Create a public bucket named 'site-logos' in Supabase Dashboard." },
        { status: 503 }
      );
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || "Upload failed." }, { status: 500 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

  const { error: updateErr } = await supabaseAdmin
    .from("sites")
    .update({ logo_url: publicUrl })
    .eq("id", siteId);

  if (updateErr) {
    return NextResponse.json({ error: "Upload succeeded but saving logo URL failed." }, { status: 500 });
  }

  return NextResponse.json({ logo_url: publicUrl });
}
