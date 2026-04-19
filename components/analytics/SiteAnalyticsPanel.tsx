"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { BarChart3, Users, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { useSiteAnalytics } from "@/hooks/useSiteAnalytics";
import { Skeleton } from "@/components/ui/Skeleton";
import { VisitorType } from "@/lib/workspace/types";

interface SiteAnalyticsPanelProps {
  siteId: string;
  siteName: string;
}

// Color mapping for visitor types
const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  Worker: "#f59e0b", // amber-500
  Subcontractor: "#3b82f6", // blue-500
  Visitor: "#10b981", // emerald-500
  Delivery: "#8b5cf6", // violet-500
};

// Visitor type display labels
const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  Worker: "Workers",
  Subcontractor: "Subcontractors",
  Visitor: "Visitors",
  Delivery: "Deliveries",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "amber" | "blue" | "emerald" | "violet";
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  };

  return (
    <div className={`rounded-xl border p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 bg-white rounded-lg shadow-sm">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl bg-slate-100" />
        <Skeleton className="h-20 rounded-xl bg-slate-100" />
        <Skeleton className="h-20 rounded-xl bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl bg-slate-100" />
        <Skeleton className="h-48 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function EmptyState({ siteName }: { siteName: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <BarChart3 className="h-6 w-6 text-slate-400" />
      </div>
      <h4 className="font-bold text-slate-900 mb-1">No activity yet</h4>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Analytics will appear once visitors start signing in at {siteName}.
      </p>
    </div>
  );
}

export function SiteAnalyticsPanel({ siteId, siteName }: SiteAnalyticsPanelProps) {
  const { data: analytics, isLoading, error } = useSiteAnalytics(siteId);

  // Determine if there's any visit data
  const hasData = analytics?.stats.totalThisWeek || 
                  analytics?.stats.todayCount || 
                  (analytics?.visitorTypeBreakdown.length ?? 0) > 0;

  // Filter peak hours to only show hours with activity for cleaner display
  const activePeakHours = useMemo(() => {
    if (!analytics?.peakHours) return [];
    return analytics.peakHours.filter((h) => h.count > 0);
  }, [analytics?.peakHours]);

  // Determine which hours to show (if sparse, show all with data; if dense, show 6am-6pm window)
  const displayHours = useMemo(() => {
    if (!analytics?.peakHours) return [];
    const activeHours = analytics.peakHours.filter((h) => h.count > 0);
    if (activeHours.length <= 12) {
      return activeHours; // Show all if sparse
    }
    // Show 6am-6pm range (6-18) if there's a lot of activity
    return analytics.peakHours.slice(6, 19);
  }, [analytics?.peakHours]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900">Could not load analytics</p>
          <p className="text-sm text-red-600 mt-1">
            {error instanceof Error ? error.message : "Try again later"}
          </p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState siteName={siteName} />;
  }

  const { stats, visitorTypeBreakdown } = analytics!;

  // Format data for visitor type pie chart
  const pieData = visitorTypeBreakdown.map((item) => ({
    name: VISITOR_TYPE_LABELS[item.type],
    value: item.count,
    type: item.type,
    percentage: item.percentage,
  }));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="This Week"
          value={stats.totalThisWeek}
          icon={<Calendar className="h-4 w-4" />}
          color="amber"
        />
        <StatCard
          label="Today"
          value={stats.todayCount}
          icon={<TrendingUp className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          label="Daily Avg"
          value={stats.averageDaily}
          icon={<Users className="h-4 w-4" />}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Visitor Type Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h5 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            Visitor Types (30 days)
          </h5>
          <div className="h-40">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={VISITOR_TYPE_COLORS[entry.type]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-sm">
                            <p className="font-semibold text-slate-900">
                              {data.name}
                            </p>
                            <p className="text-slate-600">
                              {data.value} visits ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No visitor data
              </div>
            )}
          </div>
          {/* Legend */}
          {pieData.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {pieData.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: VISITOR_TYPE_COLORS[item.type] }}
                  />
                  <span className="text-slate-600">
                    {item.name} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak Hours Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h5 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            Peak Hours (30 days)
          </h5>
          <div className="h-40">
            {displayHours.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayHours} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={1}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-sm">
                            <p className="font-semibold text-slate-900">{label}</p>
                            <p className="text-slate-600">
                              {payload[0].value} visits
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No hourly data
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            {activePeakHours.length === 0 
              ? "No visits recorded in last 30 days" 
              : `Most active: ${displayHours.reduce((max, h) => h.count > max.count ? h : max, displayHours[0])?.label}`}
          </p>
        </div>
      </div>
    </div>
  );
}
