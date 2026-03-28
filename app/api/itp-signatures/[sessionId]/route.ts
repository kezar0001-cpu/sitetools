import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/itp-signatures/[sessionId]
// Returns base64 data URLs for all signature images in a session.
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

  // Fetch items that have a signature path stored
  const { data: items } = await supabaseAdmin
    .from("itp_items")
    .select("slug, signature")
    .eq("session_id", sessionId)
    .not("signature", "is", null);

  const signatures: { slug: string; dataUrl: string }[] = [];

  for (const item of items ?? []) {
    if (!item.signature) continue;
    try {
      const { data, error } = await supabaseAdmin.storage
        .from("itp-signatures")
        .download(item.signature);
      if (error || !data) continue;
      const arrayBuffer = await data.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      signatures.push({ slug: item.slug, dataUrl: `data:image/png;base64,${base64}` });
    } catch {
      // Skip failed downloads
    }
  }

  return NextResponse.json({ signatures });
}
