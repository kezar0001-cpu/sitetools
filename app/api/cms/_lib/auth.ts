import { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/cms/server";

const EDITOR_ROLES = ["owner", "admin", "editor"];

export async function requireCmsEditor(request: NextRequest) {
  const admin = getAdminClient();
  if (!admin) {
    return { error: "CMS requires SUPABASE_SERVICE_ROLE_KEY", status: 500 as const };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (!token) {
    return { error: "Missing bearer token", status: 401 as const };
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: "Not authenticated", status: 401 as const };
  }

  const { data: membership } = await admin
    .from("org_members")
    .select("role")
    .eq("user_id", authData.user.id)
    .in("role", EDITOR_ROLES)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "Insufficient role for CMS", status: 403 as const };
  }

  return { admin, userId: authData.user.id };
}
