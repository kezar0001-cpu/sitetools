import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface ReorderItem {
  id: string;
  sort_order: number;
}

// PATCH /api/itp-sessions/[id]/reorder
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  let items: ReorderItem[];
  try {
    items = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array required." }, { status: 400 });
  }

  // Validate item shapes
  for (const item of items) {
    if (typeof item.id !== "string" || typeof item.sort_order !== "number") {
      return NextResponse.json({ error: "Each item needs id (string) and sort_order (number)." }, { status: 400 });
    }
  }

  // Batch update sort_order — run all in parallel
  const updates = await Promise.all(
    items.map((item) =>
      supabaseAdmin
        .from("itp_items")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("session_id", sessionId)
    )
  );

  const failed = updates.filter((r) => r.error);
  if (failed.length > 0) {
    console.error("Reorder partial failure:", failed.map((r) => r.error));
    return NextResponse.json({ error: "Some items failed to update." }, { status: 500 });
  }

  // Audit log entry
  await supabaseAdmin.from("itp_audit_log").insert({
    session_id: sessionId,
    item_id: null,
    action: "update",
    performed_by_user_id: user.id,
    new_values: { reordered_item_ids: items.map((i) => i.id) },
  });

  return NextResponse.json({ success: true });
}
