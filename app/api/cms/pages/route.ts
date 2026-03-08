import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/cms/server";
import { requireCmsEditor } from "@/app/api/cms/_lib/auth";

export async function GET() {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "CMS not configured" }, { status: 500 });

  const { data: pages, error } = await admin.from("cms_pages").select("*").order("page_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages });
}

export async function POST(request: NextRequest) {
  const auth = await requireCmsEditor(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.title || !body.slug) return NextResponse.json({ error: "title and slug required" }, { status: 400 });

  const { data: page, error } = await auth.admin
    .from("cms_pages")
    .insert({
      title: body.title,
      slug: body.slug,
      page_type: body.pageType ?? "marketing",
      status: body.status ?? "draft",
      seo_title: body.seoTitle ?? null,
      seo_description: body.seoDescription ?? null,
      nav_visible: Boolean(body.navVisible),
      footer_visible: Boolean(body.footerVisible),
      page_order: body.pageOrder ?? 0,
      created_by: auth.userId,
      updated_by: auth.userId
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page });
}
