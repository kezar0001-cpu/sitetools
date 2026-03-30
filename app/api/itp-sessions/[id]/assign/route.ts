import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PATCH /api/itp-sessions/[id]/assign
// Body: { project_id: string | null, site_id: string | null }
export async function PATCH(
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

  const sessionId = params.id;

  // Verify session exists and belongs to user's company
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("itp_sessions")
    .select("id, company_id, project_id, site_id")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", session.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  let body: { project_id?: string | null; site_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const project_id = "project_id" in body ? (body.project_id ?? null) : session.project_id;
  const site_id = "site_id" in body ? (body.site_id ?? null) : session.site_id;

  // If site_id provided, verify it belongs to the same company
  if (site_id) {
    const { data: site } = await supabaseAdmin
      .from("sites")
      .select("id, project_id")
      .eq("id", site_id)
      .single();
    if (!site) {
      return NextResponse.json({ error: "Site not found." }, { status: 404 });
    }
    // If a project is also being set, ensure the site belongs to that project
    if (project_id && site.project_id && site.project_id !== project_id) {
      return NextResponse.json({ error: "Site does not belong to the selected project." }, { status: 400 });
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from("itp_sessions")
    .update({ project_id, site_id })
    .eq("id", sessionId);

  if (updateErr) {
    console.error("Failed to assign project/site:", updateErr);
    return NextResponse.json({ error: "Failed to update session." }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("itp_audit_log").insert({
    session_id: sessionId,
    item_id: null,
    action: "update",
    performed_by_user_id: user.id,
    old_values: { project_id: session.project_id, site_id: session.site_id },
    new_values: { project_id, site_id },
  });

  return NextResponse.json({ success: true, project_id, site_id });
}
