import { NextRequest, NextResponse } from "next/server";
import { requireCmsEditor } from "@/app/api/cms/_lib/auth";

const BUCKET = "cms-media";

export async function GET(request: NextRequest) {
  const auth = await requireCmsEditor(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.admin.from("cms_media_assets").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireCmsEditor(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const file = form.get("file");
  const altText = String(form.get("altText") ?? "");
  const caption = String(form.get("caption") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  await auth.admin.storage.createBucket(BUCKET, { public: true }).catch(() => undefined);

  const { error: uploadError } = await auth.admin.storage.from(BUCKET).upload(filePath, arrayBuffer, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicData } = auth.admin.storage.from(BUCKET).getPublicUrl(filePath);

  const { data, error } = await auth.admin
    .from("cms_media_assets")
    .insert({
      file_name: file.name,
      storage_path: filePath,
      public_url: publicData.publicUrl,
      media_type: file.type.startsWith("video") ? "video" : "image",
      mime_type: file.type,
      size_bytes: file.size,
      alt_text: altText || null,
      caption: caption || null,
      created_by: auth.userId,
      updated_by: auth.userId
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}
