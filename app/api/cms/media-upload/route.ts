import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "cms-media";

export async function POST(request: NextRequest) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const formData = await request.formData();
  const file = formData.get("file");
  const label = String(formData.get("label") || "Untitled media");
  const altText = String(formData.get("alt_text") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `uploads/${fileName}`;

  const uploadRes = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadRes.error) {
    return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });
  }

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const mediaType = file.type.startsWith("video/") ? "video" : "image";

  const { data, error } = await supabase
    .from("cms_media")
    .insert({
      label,
      media_type: mediaType,
      storage_path: storagePath,
      public_url: publicUrl,
      alt_text: altText || null,
      mime_type: file.type || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}
