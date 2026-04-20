import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

interface WorkerHistoryVisit {
  id: string;
  site_id: string;
  site_name: string;
  full_name: string;
  phone_number: string | null;
  company_name: string;
  visitor_type: string;
  signed_in_at: string;
  signed_out_at: string | null;
  duration_minutes: number | null;
}

interface WorkerHistorySummary {
  full_name: string;
  company_name: string;
  visitor_type: string;
  phone_number: string | null;
  total_visits: number;
  total_hours_on_site: number;
  first_visit_date: string | null;
  last_visit_date: string | null;
}

interface WorkerHistoryResponse {
  summary: WorkerHistorySummary;
  recent_visits: WorkerHistoryVisit[];
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pty\s+ltd|pty\s+limited|ltd|limited|inc|corp|corporation)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function companyNamesMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeCompanyName(name1);
  const normalized2 = normalizeCompanyName(name2);
  if (normalized1 === normalized2) return true;
  // Check if one contains the other
  if (normalized1.length > 3 && normalized2.length > 3) {
    return normalized1.includes(normalized2) || normalized2.includes(normalized1);
  }
  return false;
}

function namesMatch(name1: string, name2: string): boolean {
  const normalized1 = name1.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const normalized2 = name2.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  if (normalized1 === normalized2) return true;
  // Check for name variations (first/last order, nicknames)
  const parts1 = normalized1.split(/\s+/).filter(p => p.length > 1);
  const parts2 = normalized2.split(/\s+/).filter(p => p.length > 1);
  // Require at least 2 parts (first + last name)
  if (parts1.length >= 2 && parts2.length >= 2) {
    // Check if last name matches
    const last1 = parts1[parts1.length - 1];
    const last2 = parts2[parts2.length - 1];
    if (last1 === last2) {
      // Check if first name initial or full first name matches
      const first1 = parts1[0];
      const first2 = parts2[0];
      return first1[0] === first2[0] || first1 === first2;
    }
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const fullName = searchParams.get("fullName");
    const workerCompanyName = searchParams.get("companyName");
    const phoneNumber = searchParams.get("phoneNumber");

    if (!companyId || !fullName || !workerCompanyName) {
      return NextResponse.json(
        { message: "companyId, fullName, and companyName are required" },
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

    // Fetch all site visits for this company within last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const { data: allVisits, error: visitsError } = await supabaseAdmin
      .from("site_visits")
      .select(`
        id,
        site_id,
        full_name,
        phone_number,
        company_name,
        visitor_type,
        signed_in_at,
        signed_out_at,
        sites!inner(name, company_id)
      `)
      .eq("sites.company_id", companyId)
      .gte("signed_in_at", thirtyDaysAgoStr)
      .order("signed_in_at", { ascending: false });

    if (visitsError) {
      console.error("[worker-history] Error fetching visits:", visitsError);
      return NextResponse.json(
        { message: "Failed to fetch worker history" },
        { status: 500 }
      );
    }

    // Filter visits that match the worker profile using fuzzy matching
    const matchingVisits = (allVisits || []).filter(visit => {
      const nameMatch = namesMatch(visit.full_name, fullName);
      const companyMatch = companyNamesMatch(visit.company_name, workerCompanyName);
      
      // Require name + company match, phone is optional but strengthens match
      return nameMatch && companyMatch;
    });

    // Calculate visit durations
    const visitsWithDuration: WorkerHistoryVisit[] = matchingVisits.map(visit => {
      const siteData = Array.isArray(visit.sites) ? visit.sites[0] : visit.sites;
      let durationMinutes: number | null = null;
      
      if (visit.signed_out_at && visit.signed_in_at) {
        const signIn = new Date(visit.signed_in_at);
        const signOut = new Date(visit.signed_out_at);
        durationMinutes = Math.round((signOut.getTime() - signIn.getTime()) / (1000 * 60));
      }

      return {
        id: visit.id,
        site_id: visit.site_id,
        site_name: siteData?.name || "Unknown Site",
        full_name: visit.full_name,
        phone_number: visit.phone_number,
        company_name: visit.company_name,
        visitor_type: visit.visitor_type,
        signed_in_at: visit.signed_in_at,
        signed_out_at: visit.signed_out_at,
        duration_minutes: durationMinutes,
      };
    });

    // Calculate summary statistics
    const totalVisits = visitsWithDuration.length;
    const totalMinutes = visitsWithDuration.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal

    // Sort by date to get first and last visit
    const sortedByDate = [...visitsWithDuration].sort(
      (a, b) => new Date(a.signed_in_at).getTime() - new Date(b.signed_in_at).getTime()
    );

    const firstVisitDate = sortedByDate[0]?.signed_in_at || null;
    const lastVisitDate = sortedByDate[sortedByDate.length - 1]?.signed_in_at || null;

    // Most common visitor type
    const typeCounts: Record<string, number> = {};
    visitsWithDuration.forEach(v => {
      typeCounts[v.visitor_type] = (typeCounts[v.visitor_type] || 0) + 1;
    });
    const mostCommonType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "Worker";

    const response: WorkerHistoryResponse = {
      summary: {
        full_name: fullName,
        company_name: workerCompanyName,
        visitor_type: mostCommonType,
        phone_number: phoneNumber || matchingVisits[0]?.phone_number || null,
        total_visits: totalVisits,
        total_hours_on_site: totalHours,
        first_visit_date: firstVisitDate,
        last_visit_date: lastVisitDate,
      },
      recent_visits: visitsWithDuration.slice(0, 50), // Limit to 50 recent visits
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[worker-history] unexpected error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
