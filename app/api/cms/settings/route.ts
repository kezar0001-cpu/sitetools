import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SITE_SETTINGS } from "@/lib/cms/defaults";
import { getAdminClient } from "@/lib/cms/server";
import { requireCmsEditor } from "@/app/api/cms/_lib/auth";

export async function GET() {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ settings: DEFAULT_SITE_SETTINGS });

  const { data } = await admin.from("cms_site_settings").select("settings_json").eq("id", 1).maybeSingle();
  return NextResponse.json({ settings: data?.settings_json ?? DEFAULT_SITE_SETTINGS });
}

export async function PUT(request: NextRequest) {
  const auth = await requireCmsEditor(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { error } = await auth.admin.from("cms_site_settings").upsert({
    id: 1,
    settings_json: body,
    updated_by: auth.userId
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
