import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/itp-audit-log/[sessionId]
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
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

  const { sessionId } = params;

  // Verify session belongs to user's company
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("itp_sessions")
    .select("id, company_id")
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

  const { data: logs, error: logsErr } = await supabaseAdmin
    .from("itp_audit_log")
    .select("id, session_id, item_id, action, performed_by_user_id, performed_at, old_values, new_values")
    .eq("session_id", sessionId)
    .order("performed_at", { ascending: false })
    .limit(200);

  if (logsErr) {
    return NextResponse.json({ error: "Failed to fetch audit log." }, { status: 500 });
  }

  return NextResponse.json({ logs: logs ?? [] });
}
