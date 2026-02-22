import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  // Extract the real user from the Authorization header — never trust the body
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !caller) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { email, password, org_id, site_id } = await req.json();

  if (!email || !password || !org_id || !site_id) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Verify the ACTUAL caller is an admin of this org
  const { data: membership, error: memErr } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", org_id)
    .eq("user_id", caller.id)
    .single();

  if (memErr || !membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Create the user account
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !newUser.user) {
    return NextResponse.json({ error: createErr?.message ?? "Failed to create user." }, { status: 500 });
  }

  // Add them as an editor in the org, scoped to the selected site
  const { error: insertErr } = await supabaseAdmin.from("org_members").insert({
    org_id,
    user_id: newUser.user.id,
    role: "editor",
    site_id,
  });

  if (insertErr) {
    // Roll back the created user if member insert fails
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: "Failed to assign editor to site." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: newUser.user.id });
}
