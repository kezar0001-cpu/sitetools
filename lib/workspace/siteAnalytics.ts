import { supabase } from "@/lib/supabase";
import { VisitorType } from "@/lib/workspace/types";

// Query keys for TanStack Query
export const siteAnalyticsKeys = {
  all: ["site-analytics"] as const,
  site: (siteId: string | null) => ["site-analytics", "site", siteId] as const,
} as const;

/**
 * Visitor type breakdown data point
 */
export interface VisitorTypeBreakdown {
  type: VisitorType;
  count: number;
  percentage: number;
}

/**
 * Peak hour data point (hour of day with visit count)
 */
export interface PeakHourData {
  hour: number; // 0-23
  label: string; // "12am", "1pm", etc.
  count: number;
}

/**
 * Visit statistics summary
 */
export interface VisitStats {
  totalThisWeek: number;
  todayCount: number;
  averageDaily: number;
  weekDailyAverage: number; // Same as averageDaily, more explicit naming
}

/**
 * Complete site analytics data
 */
export interface SiteAnalyticsData {
  siteId: string;
  stats: VisitStats;
  visitorTypeBreakdown: VisitorTypeBreakdown[];
  peakHours: PeakHourData[];
  dateRange: {
    from: string;
    to: string;
  };
}

/**
 * Fetch site analytics data including:
 * - Visit stats (total this week, today, average daily)
 * - Visitor type breakdown
 * - Peak hours (aggregated over last 30 days)
 */
export async function fetchSiteAnalytics(siteId: string): Promise<SiteAnalyticsData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  // Format dates for Supabase queries
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
  const startOfTodayIso = startOfToday.toISOString();
  const startOfWeekIso = startOfWeek.toISOString();

  // Fetch all visits for the site in the last 30 days
  const { data: visits, error } = await supabase
    .from("site_visits")
    .select("visitor_type, signed_in_at, signed_out_at")
    .eq("site_id", siteId)
    .gte("signed_in_at", thirtyDaysAgoIso)
    .order("signed_in_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch site analytics: ${error.message}`);
  }

  const visitsData = visits || [];

  // Calculate visit stats
  const todayCount = visitsData.filter((v) => 
    new Date(v.signed_in_at) >= startOfToday
  ).length;

  const totalThisWeek = visitsData.filter((v) => 
    new Date(v.signed_in_at) >= startOfWeek
  ).length;

  // Calculate daily average over the 30-day period
  const uniqueDays = new Set(
    visitsData.map((v) => v.signed_in_at.split("T")[0])
  ).size;
  const averageDaily = uniqueDays > 0 
    ? Math.round(visitsData.length / uniqueDays) 
    : 0;

  // Calculate visitor type breakdown
  const typeCounts = new Map<VisitorType, number>();
  visitsData.forEach((visit) => {
    const type = visit.visitor_type as VisitorType;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  const totalVisits = visitsData.length;
  const visitorTypeBreakdown: VisitorTypeBreakdown[] = [
    "Worker",
    "Subcontractor",
    "Visitor",
    "Delivery",
  ].map((type) => {
    const count = typeCounts.get(type as VisitorType) || 0;
    return {
      type: type as VisitorType,
      count,
      percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
    };
  }).filter((item) => item.count > 0); // Only include types with visits

  // Calculate peak hours (0-23, aggregated)
  const hourCounts = new Array(24).fill(0);
  visitsData.forEach((visit) => {
    const hour = new Date(visit.signed_in_at).getHours();
    hourCounts[hour]++;
  });

  // Format hour labels
  const formatHour = (h: number): string => {
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  };

  // Only show hours with activity for cleaner charts, but keep all for the data structure
  const peakHours: PeakHourData[] = hourCounts.map((count, hour) => ({
    hour,
    label: formatHour(hour),
    count,
  }));

  return {
    siteId,
    stats: {
      totalThisWeek,
      todayCount,
      averageDaily,
      weekDailyAverage: averageDaily,
    },
    visitorTypeBreakdown,
    peakHours,
    dateRange: {
      from: thirtyDaysAgoIso,
      to: now.toISOString(),
    },
  };
}

/**
 * Check if analytics should be shown for a site (has at least one visit)
 */
export async function hasAnalyticsData(siteId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("site_visits")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
