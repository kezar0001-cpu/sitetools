import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DashboardStats } from "@/lib/dashboard/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId is required" },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user has access to this company
    const { data: membership } = await supabaseAdmin
      .from("company_memberships")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { message: "Forbidden: You do not have access to this company" },
        { status: 403 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all stats in parallel
    const [
      sitesResult,
      visitsResult,
      itpsResult,
      photosResult,
    ] = await Promise.all([
      // Active Sites
      supabaseAdmin
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true),

      // On Site Today (signed in today and not signed out)
      // Query visits for sites belonging to this company
      supabaseAdmin
        .from("site_visits")
        .select("id, sites!inner(company_id)", { count: "exact", head: true })
        .eq("sites.company_id", companyId)
        .gte("signed_in_at", `${today}T00:00:00`)
        .lt("signed_in_at", `${today}T23:59:59`)
        .is("signed_out_at", null),

      // Open ITPs (active sessions)
      supabaseAdmin
        .from("itp_sessions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active"),

      // Photos This Week - join through site_diaries to filter by company
      supabaseAdmin
        .from("site_diary_photos")
        .select("id, site_diaries!inner(company_id)", { count: "exact", head: true })
        .gte("created_at", weekAgo)
        .eq("site_diaries.company_id", companyId),
    ]);

    // Handle potential errors gracefully - log but don't fail
    if (sitesResult.error) {
      console.error("[dashboard/stats] sites query error:", sitesResult.error.message);
    }
    if (visitsResult.error) {
      console.error("[dashboard/stats] visits query error:", visitsResult.error.message);
    }
    if (itpsResult.error) {
      console.error("[dashboard/stats] itps query error:", itpsResult.error.message);
    }
    if (photosResult.error) {
      console.error("[dashboard/stats] photos query error:", photosResult.error.message);
    }

    const stats: DashboardStats = {
      activeSites: sitesResult.count ?? 0,
      onSiteToday: visitsResult.count ?? 0,
      openItps: itpsResult.count ?? 0,
      photosThisWeek: photosResult.count ?? 0,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("[dashboard/stats] unexpected error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
