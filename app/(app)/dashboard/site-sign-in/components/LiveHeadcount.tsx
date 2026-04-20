"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ChevronDown, ChevronUp, Users, Activity, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SiteVisit } from "@/lib/workspace/types";

interface LiveHeadcountProps {
  siteId: string;
  companyId: string;
  initialVisits?: SiteVisit[];
}

interface ActiveWorker {
  id: string;
  full_name: string;
  company_name: string;
  visitor_type: string;
  signed_in_at: string;
  signed_out_at: string | null;
}

/**
 * Format time ago (e.g., "2 min ago", "just now")
 */
function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Get freshness color based on sign-in time
 */
function getFreshnessColor(signedInAt: string): string {
  const mins = Math.floor((Date.now() - new Date(signedInAt).getTime()) / (1000 * 60));
  if (mins < 15) return "text-emerald-600 bg-emerald-50";
  if (mins < 60) return "text-amber-600 bg-amber-50";
  return "text-slate-500 bg-slate-100";
}

export function LiveHeadcount({ siteId, companyId, initialVisits = [] }: LiveHeadcountProps) {
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>(() =>
    initialVisits.filter((v) => !v.signed_out_at)
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial active workers
  useEffect(() => {
    async function fetchActiveWorkers() {
      const { data, error } = await supabase
        .from("site_visits")
        .select("id, full_name, company_name, visitor_type, signed_in_at, signed_out_at")
        .eq("site_id", siteId)
        .eq("company_id", companyId)
        .is("signed_out_at", null)
        .order("signed_in_at", { ascending: false });

      if (!error && data) {
        setActiveWorkers(data);
        setLastUpdate(new Date());
      }
    }

    fetchActiveWorkers();
  }, [siteId, companyId]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!siteId || !companyId) return;

    // Cleanup any previous subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `live-headcount-${siteId}`;

    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "site_visits",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const newVisit = payload.new as ActiveWorker;
          // Only add if not already signed out
          if (!newVisit.signed_out_at) {
            setActiveWorkers((prev) => {
              // Avoid duplicates
              if (prev.some((w) => w.id === newVisit.id)) return prev;
              return [newVisit, ...prev];
            });
            setLastUpdate(new Date());
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "site_visits",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const updated = payload.new as ActiveWorker;
          setActiveWorkers((prev) => {
            // Remove if signed out
            if (updated.signed_out_at) {
              return prev.filter((w) => w.id !== updated.id);
            }
            // Update or add if still active
            const exists = prev.some((w) => w.id === updated.id);
            if (exists) {
              return prev.map((w) => (w.id === updated.id ? updated : w));
            }
            return [updated, ...prev];
          });
          setLastUpdate(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "site_visits",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setActiveWorkers((prev) => prev.filter((w) => w.id !== deleted.id));
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [siteId, companyId]);

  // Auto-refresh indicator animation
  const [indicatorPulse, setIndicatorPulse] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setIndicatorPulse(true);
      setTimeout(() => setIndicatorPulse(false), 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const count = activeWorkers.length;

  // Sort by most recent sign-ins first
  const sortedWorkers = useMemo(() => {
    return [...activeWorkers].sort(
      (a, b) => new Date(b.signed_in_at).getTime() - new Date(a.signed_in_at).getTime()
    );
  }, [activeWorkers]);

  // Take top 10 for display
  const displayWorkers = isExpanded ? sortedWorkers : sortedWorkers.slice(0, 5);
  const hasMore = sortedWorkers.length > 5;

  if (count === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Live Headcount</p>
              <p className="text-xs text-slate-500">No workers currently on site</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className={`h-3 w-3 ${isLive ? "text-emerald-500" : "text-slate-400"}`} />
              {isLive ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header with count badge */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                count > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Users className="h-6 w-6" />
              {/* Pulse animation ring */}
              {count > 0 && (
                <span className="absolute inset-0 rounded-xl bg-amber-400 animate-ping opacity-20" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Live Headcount</p>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                    isLive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Activity
                    className={`h-3 w-3 ${indicatorPulse && isLive ? "scale-110" : ""} transition-transform`}
                  />
                  {isLive ? "Live" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {count} {count === 1 ? "worker" : "workers"} currently on site
              </p>
            </div>
          </div>

          {/* Large count badge */}
          <div className="flex flex-col items-end">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">{count}</span>
            <span className="text-xs text-slate-400">on site</span>
          </div>
        </div>

        {/* Last update timestamp */}
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          <span>Updated {formatTimeAgo(lastUpdate.toISOString())}</span>
        </div>
      </div>

      {/* Collapsible worker list */}
      <div className="border-t border-slate-100">
        <div className="divide-y divide-slate-50">
          {displayWorkers.map((worker) => (
            <div
              key={worker.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-slate-600">
                    {worker.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {worker.full_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {worker.company_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-400">
                  {formatTimeAgo(worker.signed_in_at)}
                </span>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    getFreshnessColor(worker.signed_in_at).split(" ")[1]
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Expand/collapse button */}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {sortedWorkers.length - 5} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
