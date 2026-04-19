import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// GET /api/itp-templates?company_id=<uuid>
export async function GET(req: NextRequest) {
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
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("company_id");
  if (!companyId) return NextResponse.json({ error: "company_id required." }, { status: 400 });

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
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
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

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

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", company_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
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
    .select("type, phase, title, description, sort_order, reference_standard, responsibility, records_required, acceptance_criteria")
    .eq("session_id", session_id)
    .order("sort_order", { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: "Failed to fetch session items." }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templateItems = (items ?? []).map((item: any) => ({
    type: item.type,
    title: item.title,
    description: item.description,
    ...(item.reference_standard && { reference_standard: item.reference_standard }),
    ...(item.responsibility && { responsibility: item.responsibility }),
    ...(item.records_required && { records_required: item.records_required }),
    ...(item.acceptance_criteria && { acceptance_criteria: item.acceptance_criteria }),
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
