import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function checkMembership(userId: string, companyId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// GET /api/itp-templates?company_id=<uuid>
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get("company_id");
  if (!companyId) return NextResponse.json({ error: "company_id required." }, { status: 400 });

  if (!(await checkMembership(user.id, companyId))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("itp_templates")
    .select("id, company_id, name, created_by_user_id, created_at, items")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load templates." }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST /api/itp-templates — save current session as template
// Body: { company_id, name, session_id }
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { company_id?: string; name?: string; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { company_id, name, session_id } = body;
  if (!company_id || !name || !session_id) {
    return NextResponse.json(
      { error: "company_id, name, and session_id are required." },
      { status: 400 }
    );
  }

  if (!(await checkMembership(user.id, company_id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Verify session belongs to this company
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("itp_sessions")
    .select("id, company_id")
    .eq("id", session_id)
    .eq("company_id", company_id)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  // Fetch the session's items
  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("itp_items")
    .select("type, title, description, sort_order")
    .eq("session_id", session_id)
    .order("sort_order", { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: "Failed to fetch session items." }, { status: 500 });
  }

  const templateItems = (items ?? []).map(({ type, title, description }) => ({
    type,
    title,
    description,
  }));

  const { data: template, error: insertErr } = await supabaseAdmin
    .from("itp_templates")
    .insert({
      company_id,
      name: name.trim(),
      created_by_user_id: user.id,
      items: templateItems,
    })
    .select("id, company_id, name, created_by_user_id, created_at, items")
    .single();

  if (insertErr || !template) {
    return NextResponse.json({ error: "Failed to save template." }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
