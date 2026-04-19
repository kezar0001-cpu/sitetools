import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

interface BulkMovePayload {
  action: "move";
  siteIds: string[];
  targetProjectId: string | null;
}

interface BulkArchivePayload {
  action: "archive";
  siteIds: string[];
}

interface BulkRestorePayload {
  action: "restore";
  siteIds: string[];
}

type BulkOperationPayload = BulkMovePayload | BulkArchivePayload | BulkRestorePayload;

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get auth token from header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const payload = (await request.json()) as BulkOperationPayload;
    
    if (!payload.siteIds || payload.siteIds.length === 0) {
      return NextResponse.json({ error: "No sites selected" }, { status: 400 });
    }

    // Get user's company membership and role for authorization
    const { data: membership } = await supabaseAdmin
      .from("company_memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Not a company member" }, { status: 403 });
    }

    // Only owner, admin, or manager can perform bulk operations
    const allowedRoles = ["owner", "admin", "manager"];
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify all sites belong to the user's company
    const { data: sites } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("company_id", membership.company_id)
      .in("id", payload.siteIds);

    const accessibleSiteIds = sites?.map((s: { id: string }) => s.id) ?? [];
    const unauthorizedSites = payload.siteIds.filter(id => !accessibleSiteIds.includes(id));
    
    if (unauthorizedSites.length > 0) {
      return NextResponse.json(
        { error: "Unauthorized access to some sites" },
        { status: 403 }
      );
    }

    let result;

    switch (payload.action) {
      case "move": {
        // If targetProjectId is provided, verify it belongs to the company
        if (payload.targetProjectId) {
          const { data: project } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("id", payload.targetProjectId)
            .eq("company_id", membership.company_id)
            .single();

          if (!project) {
            return NextResponse.json(
              { error: "Target project not found or unauthorized" },
              { status: 400 }
            );
          }
        }

        const { data, error } = await supabaseAdmin
          .from("sites")
          .update({ project_id: payload.targetProjectId })
          .in("id", accessibleSiteIds)
          .select("id, name, project_id");

        if (error) throw error;
        result = { moved: data?.length ?? 0, sites: data };
        break;
      }

      case "archive": {
        const { data, error } = await supabaseAdmin
          .from("sites")
          .update({ is_active: false })
          .in("id", accessibleSiteIds)
          .select("id, name");

        if (error) throw error;
        result = { archived: data?.length ?? 0, sites: data };
        break;
      }

      case "restore": {
        const { data, error } = await supabaseAdmin
          .from("sites")
          .update({ is_active: true })
          .in("id", accessibleSiteIds)
          .select("id, name");

        if (error) throw error;
        result = { restored: data?.length ?? 0, sites: data };
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action: payload.action,
      ...result,
    });

  } catch (error) {
    console.error("[sites/bulk] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
