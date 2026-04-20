import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "company-logos";
const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(req: NextRequest) {
  // Create Supabase client inside handler to avoid build-time errors
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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

  const companyId = formData.get("company_id") as string | null;
  const file = formData.get("file") as File | null;
  if (!companyId || !file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing company_id or file." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File must be under ${MAX_SIZE_MB} MB.` }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Allowed types: PNG, JPEG, WebP, SVG." }, { status: 400 });
  }

  // Check if user has admin/owner role for this company
  const { data: membership } = await supabaseAdmin
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", caller.id)
    .single();

  // Also check if user is the company owner
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();

  const isOwner = company?.owner_user_id === caller.id;
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Only company owners or admins can upload a logo." }, { status: 403 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `${companyId}.${safeExt}`;

  const { error: bucketErr } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (bucketErr) {
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    if (createErr) {
      return NextResponse.json(
        { error: "Storage not configured. Create a public bucket named 'company-logos' in Supabase Dashboard." },
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

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  const { error: updateErr } = await supabaseAdmin
    .from("companies")
    .update({ logo_url: publicUrl })
    .eq("id", companyId);

  if (updateErr) {
    return NextResponse.json({ error: "Upload succeeded but saving logo URL failed." }, { status: 500 });
  }

  return NextResponse.json({ logo_url: publicUrl });
}
