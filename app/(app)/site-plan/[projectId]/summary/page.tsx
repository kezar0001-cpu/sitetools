"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks } from "@/hooks/useSitePlanTasks";
import type { TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import { ProgressBar } from "../../components/ProgressSlider";
import { StatusBadge } from "../../components/StatusBadge";
import { SitePlanBottomNav } from "../../components/SitePlanBottomNav";
import { TaskListSkeleton } from "../../components/Skeleton";
import { QueryProvider } from "@/components/QueryProvider";

const DONUT_COLORS: Record<TaskStatus, string> = {
  not_started: "#94a3b8",
  in_progress: "#3b82f6",
  completed: "#22c55e",
  delayed: "#ef4444",
  on_hold: "#f59e0b",
};

function DonutChart({
  counts,
  total,
}: {
  counts: Record<TaskStatus, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center mx-auto">
        <span className="text-xs text-slate-400">No tasks</span>
      </div>
    );
  }

  const statuses = Object.keys(counts) as TaskStatus[];
  let cumulative = 0;
  const segments: { offset: number; length: number; color: string }[] = [];

  for (const s of statuses) {
    const pct = (counts[s] / total) * 100;
    if (pct > 0) {
      segments.push({
        offset: cumulative,
        length: pct,
        color: DONUT_COLORS[s],
      });
      cumulative += pct;
    }
  }

  const circumference = 2 * Math.PI * 60;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${(seg.length / 100) * circumference} ${circumference}`}
            strokeDashoffset={`${-(seg.offset / 100) * circumference}`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{total}</span>
      </div>
    </div>
  );
}

function SummaryPageInner() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks, isLoading } = useSitePlanTasks(projectId);

  const stats = useMemo(() => {
    if (!tasks) return null;

    const counts: Record<TaskStatus, number> = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
      on_hold: 0,
    };

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let overdue = 0;
    let dueThisWeek = 0;
    let noProgress = 0;
    const criticalTasks: typeof tasks = [];

    for (const t of tasks) {
      counts[t.status]++;
      const end = new Date(t.end_date);
      if (end < now && t.progress < 100) overdue++;
      if (end >= now && end <= weekEnd && t.progress < 100) dueThisWeek++;
      if (t.progress === 0 && t.type !== "phase") noProgress++;
      if (t.status === "delayed" && !t.actual_start) {
        criticalTasks.push(t);
      }
    }

    const overall =
      tasks.length > 0
        ? Math.round(
            tasks.reduce((s, t) => s + t.progress, 0) / tasks.length
          )
        : 0;

    return { counts, overdue, dueThisWeek, noProgress, criticalTasks, overall };
  }, [tasks]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`/site-plan/${projectId}`)}
              className="p-1.5 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {project?.name ?? "Loading..."} — Summary
              </h1>
            </div>
          </div>

          {/* View toggles (desktop) */}
          <div className="hidden md:flex items-center gap-2 mt-1">
            <div className="flex items-center border border-slate-200 rounded-md ml-auto">
              <button
                onClick={() => router.push(`/site-plan/${projectId}`)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-l-md"
              >
                List
              </button>
              <button
                onClick={() =>
                  router.push(`/site-plan/${projectId}/gantt`)
                }
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                Gantt
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-r-md">
                Summary
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
          {isLoading || !stats ? (
            <TaskListSkeleton />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
              {/* Overall progress */}
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-700">
                  Overall Progress
                </h2>
                <div className="flex items-center gap-3">
                  <ProgressBar value={stats.overall} className="flex-1" />
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    {stats.overall}%
                  </span>
                </div>
              </div>

              {/* Donut + status legend */}
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <DonutChart
                  counts={stats.counts}
                  total={tasks?.length ?? 0}
                />
                <div className="space-y-2">
                  {(Object.keys(stats.counts) as TaskStatus[]).map((s) => (
                    <div
                      key={s}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[s] }}
                        />
                        <span className="text-sm text-slate-600">
                          {STATUS_LABELS[s]}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {stats.counts[s]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {stats.overdue}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Overdue</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.dueThisWeek}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Due This Week</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-700">
                    {stats.noProgress}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">No Progress</p>
                </div>
              </div>

              {/* Critical path alerts */}
              {stats.criticalTasks.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Critical Path — Delayed with No Actual Start
                  </h2>
                  <div className="space-y-2">
                    {stats.criticalTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            {t.wbs_code} {t.name}
                          </p>
                          <p className="text-xs text-red-600">
                            Planned: {t.start_date} – {t.end_date}
                          </p>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SitePlanBottomNav projectId={projectId} />
    </div>
  );
}

export default function SummaryPage() {
  return (
    <QueryProvider>
      <SummaryPageInner />
    </QueryProvider>
  );
}
