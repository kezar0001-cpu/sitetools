import { supabase } from "@/lib/supabase";
import { DashboardStats } from "./types";

export async function fetchDashboardStats(companyId: string): Promise<DashboardStats> {
  try {
    // Get current session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`/api/dashboard/stats?companyId=${encodeURIComponent(companyId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch dashboard stats");
    }

    const data = await response.json();
    return data as DashboardStats;
  } catch (err) {
    console.error("[dashboard/client] fetchDashboardStats error:", err);
    // Return zeros on error so UI still renders
    return {
      activeSites: 0,
      onSiteToday: 0,
      openItps: 0,
      photosThisWeek: 0,
    };
  }
}

// Client-side fallback using direct Supabase queries
// Use this if you need stats without the API route
export async function fetchDashboardStatsClientSide(companyId: string): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [sitesResult, visitsResult, itpsResult, photosResult] = await Promise.all([
    // Active Sites
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
    
    // On Site Today (signed in today and not signed out)
    supabase
      .from("site_visits")
      .select("id, sites!inner(company_id)", { count: "exact", head: true })
      .eq("sites.company_id", companyId)
      .gte("signed_in_at", `${today}T00:00:00`)
      .lt("signed_in_at", `${today}T23:59:59`)
      .is("signed_out_at", null),
    
    // Open ITPs (active sessions or pending items)
    supabase
      .from("itp_sessions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    
    // Photos This Week
    supabase
      .from("site_diary_photos")
      .select("id, site_diaries!inner(company_id)", { count: "exact", head: true })
      .gte("created_at", weekAgo)
      .eq("site_diaries.company_id", companyId),
  ]);

  return {
    activeSites: sitesResult.count ?? 0,
    onSiteToday: visitsResult.count ?? 0,
    openItps: itpsResult.count ?? 0,
    photosThisWeek: photosResult.count ?? 0,
  };
}
