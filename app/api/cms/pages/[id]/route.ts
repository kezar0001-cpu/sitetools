import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/cms/server";
import { requireCmsEditor } from "@/app/api/cms/_lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "CMS not configured" }, { status: 500 });

  const { data: page } = await admin.from("cms_pages").select("*").eq("id", params.id).maybeSingle();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const { data: blocks, error: blockError } = await admin.from("cms_page_blocks").select("*").eq("page_id", params.id).order("order_index", { ascending: true });
  if (blockError) return NextResponse.json({ error: blockError.message }, { status: 500 });

  return NextResponse.json({ page, blocks });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCmsEditor(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updated_by: auth.userId,
    updated_at: new Date().toISOString()
  };

  for (const [key, value] of Object.entries(body.page ?? {})) {
    if (["title", "slug", "status", "seo_title", "seo_description", "og_title", "og_description", "og_image_url", "canonical_url", "no_index", "nav_label", "nav_visible", "footer_visible", "page_order", "page_type"].includes(key)) {
      updates[key] = value;
    }
  }

  const { error: pageErr } = await auth.admin.from("cms_pages").update(updates).eq("id", params.id);
  if (pageErr) return NextResponse.json({ error: pageErr.message }, { status: 500 });

  if (Array.isArray(body.blocks)) {
    const { error: deleteErr } = await auth.admin.from("cms_page_blocks").delete().eq("page_id", params.id);
    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

    if (body.blocks.length > 0) {
      const rows = body.blocks.map((block: { [key: string]: unknown }, index: number) => ({
        page_id: params.id,
        block_type: block.type,
        title: block.title ?? `${block.type} block`,
        is_visible: block.isVisible !== false,
        order_index: index,
        content: block.content ?? {},
        created_by: auth.userId,
        updated_by: auth.userId
      }));

      const { error: insertErr } = await auth.admin.from("cms_page_blocks").insert(rows);
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
