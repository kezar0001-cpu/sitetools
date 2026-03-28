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
  total_items: number;
  signed_items: number;
  pending_holds: number;
}

// ---------------------------------------------------------------------------
// ITP Progress Bar
// ---------------------------------------------------------------------------

function ITPProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-violet-500 rounded-full transition-all duration-300"
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
  const pct =
    stats.total_items > 0
      ? Math.round((stats.signed_items / stats.total_items) * 100)
      : 0;

  const hasPendingHolds = stats.pending_holds > 0;
  const isComplete = stats.total_items > 0 && pct === 100;

  const statusLabel = hasPendingHolds
    ? "Hold Pending"
    : isComplete
    ? "Complete"
    : stats.total_items === 0
    ? "Empty"
    : "In Progress";

  const statusCls = hasPendingHolds
    ? "bg-red-100 text-red-700"
    : isComplete
    ? "bg-green-100 text-green-700"
    : stats.total_items === 0
    ? "bg-slate-100 text-slate-500"
    : "bg-amber-100 text-amber-700";

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-slate-200 bg-white p-5 space-y-3 hover:border-violet-300 hover:shadow-sm transition-all w-full min-h-[44px]"
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

      <ITPProgressBar value={pct} />

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 tabular-nums">
          {pct}% signed off
        </p>
        <p className="text-xs text-slate-400">
          {stats.itp_count} {stats.itp_count === 1 ? "ITP" : "ITPs"}
          {hasPendingHolds && (
            <span className="ml-1.5 text-red-500 font-semibold">
              · {stats.pending_holds} hold{stats.pending_holds !== 1 ? "s" : ""} pending
            </span>
          )}
        </p>
      </div>
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
          total_items: number;
          signed_items: number;
          pending_holds: number;
        }
      >(
        projects.map((p) => [
          p.id,
          { itp_count: 0, total_items: 0, signed_items: 0, pending_holds: 0 },
        ])
      );

      if (sessions?.length) {
        // Count sessions per project
        for (const s of sessions) {
          const key = s.project_id ?? null;
          if (!byProject.has(key)) {
            byProject.set(key, {
              itp_count: 0,
              total_items: 0,
              signed_items: 0,
              pending_holds: 0,
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
            bucket.total_items++;
            if (item.status === "signed") bucket.signed_items++;
            if (item.type === "hold" && item.status === "pending")
              bucket.pending_holds++;
          }
        }
      }

      // Build result: sort active projects by pending_holds desc, then pct asc
      const result: ProjectITPStats[] = [];
      const allProjects = projects.map((p) => {
        const s = byProject.get(p.id) ?? {
          itp_count: 0,
          total_items: 0,
          signed_items: 0,
          pending_holds: 0,
        };
        return { id: p.id, name: p.name, ...s };
      });
      // Sort: pending_holds descending (most urgent first), then pct ascending (least complete first)
      allProjects.sort((a, b) => {
        const aActive = a.itp_count > 0 ? 0 : 1;
        const bActive = b.itp_count > 0 ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        if (b.pending_holds !== a.pending_holds) return b.pending_holds - a.pending_holds;
        const aPct = a.total_items > 0 ? a.signed_items / a.total_items : 0;
        const bPct = b.total_items > 0 ? b.signed_items / b.total_items : 0;
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
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-violet-500 animate-spin" />
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
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-4 py-2 text-sm transition-colors active:scale-95"
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
            className="mt-5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-colors active:scale-95"
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
