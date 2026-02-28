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

  const body = await req.json();
  const { email, password, org_id, role, site_id, site_ids: bodySiteIds } = body;
  const siteIds: string[] = Array.isArray(bodySiteIds) ? bodySiteIds : site_id ? [site_id] : [];

  // role is optional; default to editor for backwards compatibility
  const normalizedRole = (role ?? "editor") as string;

  if (!email || !password || !org_id) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!["editor", "viewer"].includes(normalizedRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  if (normalizedRole === "editor" && siteIds.length === 0) {
    return NextResponse.json({ error: "Editors must be assigned to at least one site." }, { status: 400 });
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

  const { data: newMember, error: insertErr } = await supabaseAdmin
    .from("org_members")
    .insert({
      org_id,
      user_id: newUser.user.id,
      role: normalizedRole,
      site_id: normalizedRole === "editor" && siteIds.length > 0 ? siteIds[0] : null,
    })
    .select("id")
    // some mocked clients / Supabase variants may not support .single() here
    .maybeSingle();

  if (insertErr || !newMember) {
    // Best-effort cleanup; avoid masking the real error if admin deletion isn't available.
    await supabaseAdmin.auth.admin
      ?.deleteUser?.(newUser.user.id)
      .catch(() => undefined);

    return NextResponse.json({ error: "Failed to add member to organisation." }, { status: 500 });
  }

  if (normalizedRole === "editor" && siteIds.length > 0) {
    const { error: sitesErr } = await supabaseAdmin.from("org_member_sites").insert(
      siteIds.map((sid: string) => ({ org_member_id: newMember.id, site_id: sid }))
    );
    if (sitesErr) {
      await supabaseAdmin.from("org_members").delete().eq("id", newMember.id);
      await supabaseAdmin.auth.admin
        ?.deleteUser?.(newUser.user.id)
        .catch(() => undefined);
      return NextResponse.json({ error: "Failed to assign sites to editor." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, user_id: newUser.user.id });
}
