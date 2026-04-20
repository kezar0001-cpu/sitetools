import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// GET /api/itp-signoffs/[sessionId]
// Returns all sign-off records for a session, with base64 signature images.
// Requires authentication — only company members can access.
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
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

  // Fetch all sign-off records for the session
  const { data: signoffs, error: signoffsErr } = await supabaseAdmin
    .from("itp_item_signoffs")
    .select("id, item_id, name, role, signed_at, signature_path, notes")
    .eq("session_id", sessionId)
    .order("signed_at", { ascending: true });

  if (signoffsErr) {
    return NextResponse.json({ error: "Failed to fetch sign-offs." }, { status: 500 });
  }

  // Download signature images and base64-encode them
  const result: {
    id: string;
    item_id: string;
    name: string;
    role: string;
    signed_at: string;
    notes?: string;
    dataUrl?: string;
  }[] = [];

  for (const signoff of signoffs ?? []) {
    let dataUrl: string | undefined;
    if (signoff.signature_path) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from("itp-signatures")
          .download(signoff.signature_path);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          dataUrl = `data:image/png;base64,${base64}`;
        }
      } catch {
        // Non-critical — skip failed downloads
      }
    }
    result.push({
      id: signoff.id,
      item_id: signoff.item_id,
      name: signoff.name,
      role: signoff.role,
      signed_at: signoff.signed_at,
      ...(signoff.notes ? { notes: signoff.notes } : {}),
      dataUrl,
    });
  }

  return NextResponse.json({ signoffs: result });
}
