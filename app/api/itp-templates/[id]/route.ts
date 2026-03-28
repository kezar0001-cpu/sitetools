import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// DELETE /api/itp-templates/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { id } = params;

  // Fetch template to verify it exists and get company_id
  const { data: template, error: fetchErr } = await supabaseAdmin
    .from("itp_templates")
    .select("id, company_id")
    .eq("id", id)
    .single();

  if (fetchErr || !template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  // Verify requesting user is a member of the template's company
  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", template.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { error: deleteErr } = await supabaseAdmin
    .from("itp_templates")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    return NextResponse.json({ error: "Failed to delete template." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
