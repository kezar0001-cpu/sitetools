"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchCompanyProjects } from "@/lib/workspace/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectITPStats {
  id: string | null; // null = unassigned
  name: string;
  itp_count: number;
  hold_total: number;
  hold_done: number; // signed or waived
  witness_total: number;
  witness_done: number; // signed or waived
}

// ---------------------------------------------------------------------------
// ITP Progress Bar
// ---------------------------------------------------------------------------

function ITPProgressBar({
  value,
  color,
}: {
  value: number;
  color: "red" | "amber";
}) {
  const barCls = color === "red" ? "bg-red-500" : "bg-amber-400";
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${barCls} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

function ITPProjectCard({
  stats,
  onClick,
}: {
  stats: ProjectITPStats;
  onClick: () => void;
}) {
  const hasHolds = stats.hold_total > 0;
  const hasWitnesses = stats.witness_total > 0;
  const totalItems = stats.hold_total + stats.witness_total;

  const holdsPending = stats.hold_total - stats.hold_done;
  const witnessesPending = stats.witness_total - stats.witness_done;

  const allHoldsDone = holdsPending === 0;
  const allWitnessesDone = witnessesPending === 0;
  const isComplete = totalItems > 0 && allHoldsDone && allWitnessesDone;

  const statusLabel =
    holdsPending > 0
      ? "Hold Pending"
      : witnessesPending > 0
      ? "Witness Pending"
      : isComplete
      ? "Complete"
      : "Empty";

  const statusCls =
    holdsPending > 0
      ? "bg-red-100 text-red-700"
      : witnessesPending > 0
      ? "bg-amber-100 text-amber-700"
      : isComplete
      ? "bg-green-100 text-green-700"
      : "bg-slate-100 text-slate-500";

  const holdPct = hasHolds
    ? Math.round((stats.hold_done / stats.hold_total) * 100)
    : 100;
  const witnessPct = hasWitnesses
    ? Math.round((stats.witness_done / stats.witness_total) * 100)
    : 100;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-slate-200 bg-white p-5 space-y-3 hover:border-amber-300 hover:shadow-sm transition-all w-full min-h-[44px]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {stats.name}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusCls}`}
        >
          {statusLabel}
        </span>
      </div>

      {totalItems > 0 ? (
        <div className="space-y-2">
          {hasHolds && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Hold Points</span>
                <span className="text-xs font-medium tabular-nums text-slate-600">
                  {stats.hold_done}/{stats.hold_total} signed
                </span>
              </div>
              <ITPProgressBar value={holdPct} color="red" />
            </div>
          )}
          {hasWitnesses && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Witness Points</span>
                <span className="text-xs font-medium tabular-nums text-slate-600">
                  {stats.witness_done}/{stats.witness_total} signed
                </span>
              </div>
              <ITPProgressBar value={witnessPct} color="amber" />
            </div>
          )}
        </div>
      ) : (
        <div className="h-1.5 bg-slate-100 rounded-full" />
      )}

      <p className="text-xs text-slate-400">
        {stats.itp_count} {stats.itp_count === 1 ? "ITP" : "ITPs"}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-xl border border-slate-200 bg-slate-100 animate-pulse"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard inner
// ---------------------------------------------------------------------------

function SiteITPDashboardInner() {
  const router = useRouter();
  const { loading, summary } = useWorkspace({
    requireAuth: true,
    requireCompany: true,
  });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;

  const [stats, setStats] = useState<ProjectITPStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    loadStats(activeCompanyId);
  }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadStats(companyId: string) {
    setIsLoading(true);
    try {
      const projects = await fetchCompanyProjects(companyId);

      // Fetch all sessions (lightweight — just id + project_id)
      const { data: sessions } = await supabase
        .from("itp_sessions")
        .select("id, project_id")
        .eq("company_id", companyId);

      // Initialise project buckets (include projects with 0 ITPs)
      const byProject = new Map<
        string | null,
        {
          itp_count: number;
          hold_total: number;
          hold_done: number;
          witness_total: number;
          witness_done: number;
        }
      >(
        projects.map((p) => [
          p.id,
          { itp_count: 0, hold_total: 0, hold_done: 0, witness_total: 0, witness_done: 0 },
        ])
      );

      if (sessions?.length) {
        // Count sessions per project
        for (const s of sessions) {
          const key = s.project_id ?? null;
          if (!byProject.has(key)) {
            byProject.set(key, {
              itp_count: 0,
              hold_total: 0,
              hold_done: 0,
              witness_total: 0,
              witness_done: 0,
            });
          }
          byProject.get(key)!.itp_count++;
        }

        // Fetch item-level stats in one query
        const sessionIds = sessions.map((s) => s.id);
        const { data: items } = await supabase
          .from("itp_items")
          .select("session_id, type, status")
          .in("session_id", sessionIds);

        if (items?.length) {
          const sessionToProject = new Map(
            sessions.map((s) => [s.id, s.project_id ?? null])
          );
          for (const item of items) {
            const key = sessionToProject.get(item.session_id) ?? null;
            const bucket = byProject.get(key);
            if (!bucket) continue;
            const done = item.status === "signed" || item.status === "waived";
            if (item.type === "hold") {
              bucket.hold_total++;
              if (done) bucket.hold_done++;
            } else {
              bucket.witness_total++;
              if (done) bucket.witness_done++;
            }
          }
        }
      }

      // Build result: sort active projects by urgency (holds pending > witnesses pending > least complete)
      const result: ProjectITPStats[] = [];
      const allProjects = projects.map((p) => {
        const s = byProject.get(p.id) ?? {
          itp_count: 0,
          hold_total: 0,
          hold_done: 0,
          witness_total: 0,
          witness_done: 0,
        };
        return { id: p.id, name: p.name, ...s };
      });
      allProjects.sort((a, b) => {
        const aActive = a.itp_count > 0 ? 0 : 1;
        const bActive = b.itp_count > 0 ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        const aHoldPending = a.hold_total - a.hold_done;
        const bHoldPending = b.hold_total - b.hold_done;
        if (bHoldPending !== aHoldPending) return bHoldPending - aHoldPending;
        const aWitnessPending = a.witness_total - a.witness_done;
        const bWitnessPending = b.witness_total - b.witness_done;
        if (bWitnessPending !== aWitnessPending) return bWitnessPending - aWitnessPending;
        const aTotal = a.hold_total + a.witness_total;
        const bTotal = b.hold_total + b.witness_total;
        const aPct = aTotal > 0 ? (a.hold_done + a.witness_done) / aTotal : 0;
        const bPct = bTotal > 0 ? (b.hold_done + b.witness_done) / bTotal : 0;
        if (aPct !== bPct) return aPct - bPct;
        return a.name.localeCompare(b.name);
      });
      for (const p of allProjects) {
        result.push(p);
      }

      // Unassigned bucket (only if there are some)
      const unassigned = byProject.get(null);
      if (unassigned && unassigned.itp_count > 0) {
        result.push({ id: null, name: "Unassigned ITPs", ...unassigned });
      }

      setStats(result);
    } catch {
      // Non-critical — show empty state
    } finally {
      setIsLoading(false);
    }
  }

  if (loading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const hasAny = stats.some((s) => s.itp_count > 0);

  function handleProjectClick(projectId: string | null) {
    if (projectId) {
      router.push(`/dashboard/itp-builder?project=${projectId}`);
    } else {
      router.push("/dashboard/itp-builder?project=unassigned");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">SiteITP</h1>
          <p className="text-sm text-slate-500">
            Select a project to manage its inspection &amp; test plans
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/itp-builder")}
          className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-xl px-4 py-2 text-sm transition-colors active:scale-95"
        >
          + New ITP
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <GridSkeleton />
      ) : stats.length === 0 ? (
        /* No projects exist at all */
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <p className="text-slate-700 font-bold">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            Add a project to get started with inspection &amp; test plans.
          </p>
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="mt-5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl px-5 py-2.5 text-sm transition-colors active:scale-95"
          >
            Add a project
          </button>
        </div>
      ) : !hasAny ? (
        /* Projects exist but no ITPs created */
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
          <p className="text-slate-500 font-semibold">No ITPs yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Create your first inspection &amp; test plan to get started.
          </p>
          <button
            onClick={() => router.push("/dashboard/itp-builder")}
            className="mt-5 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-xl px-5 py-2.5 text-sm transition-colors active:scale-95"
          >
            Create ITP
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats
              .filter((s) => s.itp_count > 0)
              .map((s) => (
                <ITPProjectCard
                  key={s.id ?? "__unassigned"}
                  stats={s}
                  onClick={() => handleProjectClick(s.id)}
                />
              ))}
          </div>

          {/* Show all projects expander */}
          {stats.some((s) => s.itp_count === 0) && (
            <>
              {!showAllProjects ? (
                <button
                  onClick={() => setShowAllProjects(true)}
                  className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 py-2 transition-colors"
                >
                  Show all projects ({stats.filter((s) => s.itp_count === 0).length} with no ITPs)
                </button>
              ) : (
                <>
                  <p className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Projects with no ITPs
                  </p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats
                      .filter((s) => s.itp_count === 0)
                      .map((s) => (
                        <ITPProjectCard
                          key={s.id ?? "__empty"}
                          stats={s}
                          onClick={() => handleProjectClick(s.id)}
                        />
                      ))}
                  </div>
                  <button
                    onClick={() => setShowAllProjects(false)}
                    className="mt-2 w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 py-2 transition-colors"
                  >
                    Hide empty projects
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default function SiteITPDashboard() {
  return <SiteITPDashboardInner />;
}
