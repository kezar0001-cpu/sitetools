"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { QueryProvider } from "@/components/QueryProvider";
import { useSitePlanTasks } from "@/hooks/useSitePlanTasks";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import { useSitePlanBaselines } from "@/hooks/useSitePlanBaselines";
import { buildTaskTree } from "@/types/siteplan";

const PHASE_DOT = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];

function SummaryInner() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: tasks = [] } = useSitePlanTasks(projectId);
  const { data: delayLogs = [] } = useProjectDelayLogs(projectId);
  const { data: baselines = [] } = useSitePlanBaselines(projectId);

  const leaves = useMemo(() => tasks.filter((t) => !tasks.some((c) => c.parent_id === t.id)), [tasks]);
  const completed = leaves.filter((t) => t.progress >= 100).length;
  const delayed = tasks.filter((t) => t.status === "delayed").length;
  const pushedDays = delayLogs.filter((l) => l.impacts_completion).reduce((sum, l) => sum + l.delay_days, 0);
  const overallProgress = leaves.length > 0 ? Math.round(leaves.reduce((s, t) => s + t.progress, 0) / leaves.length) : 0;

  const phaseProgress = useMemo(() => {
    const tree = buildTaskTree(tasks);
    return tree
      .filter((phase) => phase.parent_id === null && phase.type !== "milestone")
      .map((phase) => {
        const descendants = phase.children.flatMap((child) => [child, ...child.children]);
        const leaf = descendants.filter((n) => n.children.length === 0);
        const scoped = leaf.length > 0 ? leaf : descendants;
        const done = scoped.filter((n) => n.progress >= 100).length;
        const progress = scoped.length > 0 ? Math.round(scoped.reduce((s, t) => s + t.progress, 0) / scoped.length) : 0;
        return { id: phase.id, name: phase.name, progress, done, total: scoped.length };
      })
      .sort((a, b) => a.progress - b.progress);
  }, [tasks]);

  const groupedReasons = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    delayLogs.forEach((log) => {
      const reason = log.delay_reason || "Unspecified";
      const existing = map.get(reason) ?? { count: 0, total: 0 };
      existing.count += 1;
      existing.total += log.delay_days;
      map.set(reason, existing);
    });
    return Array.from(map.entries())
      .map(([reason, stats]) => ({ reason, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [delayLogs]);

  const maxGroupDays = groupedReasons[0]?.total ?? 0;
  const baselineSnapshot = (baselines[0]?.snapshot as typeof tasks | undefined) ?? [];
  const baselineEnd = baselineSnapshot.length > 0 ? baselineSnapshot.reduce((mx, t) => (t.end_date > mx ? t.end_date : mx), baselineSnapshot[0].end_date) : null;
  const forecastEnd = tasks.length > 0 ? tasks.reduce((mx, t) => (t.end_date > mx ? t.end_date : mx), tasks[0].end_date) : null;
  const deltaDays = baselineEnd && forecastEnd ? Math.round((new Date(forecastEnd).getTime() - new Date(baselineEnd).getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <Link href={`/site-plan/${projectId}`} className="text-sm text-slate-600 hover:text-slate-900">← Back to Programme</Link>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Tasks Complete</p><p className="text-xl font-semibold">{completed}/{leaves.length}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Delayed Tasks</p><p className="text-xl font-semibold">{delayed}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Programme Pushed</p><p className={`text-xl font-semibold ${pushedDays > 0 ? "text-red-600" : "text-emerald-600"}`}>{pushedDays > 0 ? `+${pushedDays}d` : "On time"}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-slate-500">Overall Progress</p><p className="text-xl font-semibold">{overallProgress}%</p></div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Phase Progress</h3>
        {phaseProgress.map((phase, i) => (
          <div key={phase.id} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${PHASE_DOT[i % PHASE_DOT.length]}`} />
            <span className="w-28 truncate text-sm">{phase.name}</span>
            <div className="h-2 flex-1 rounded-full bg-slate-200"><div className={`h-full rounded-full ${phase.progress >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${phase.progress}%` }} /></div>
            <span className="w-10 text-right text-sm">{phase.progress}%</span>
            <span className="w-16 text-right text-xs text-slate-500">{phase.done}/{phase.total}</span>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Delay Summary</h3>
        {groupedReasons.length === 0 ? <p className="text-slate-400">No delays recorded</p> : groupedReasons.map((group) => (
          <div key={group.reason} className="space-y-1">
            <div className="flex items-center justify-between text-sm"><span>{group.reason}</span><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{group.count}</span><span>{group.total}d</span></div>
            <div className="h-2 rounded bg-red-100"><div className="h-full rounded bg-red-200" style={{ width: `${maxGroupDays ? (group.total / maxGroupDays) * 100 : 0}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Programme Dates</h3>
        <div className="flex items-center justify-between text-sm"><span>Original end date</span><span>{baselineEnd ?? "No baseline set"}</span></div>
        <div className="flex items-center justify-between text-sm"><span>Forecast end date</span><span>{forecastEnd ?? "—"}</span></div>
        {deltaDays !== null && (
          <>
            <p className={`text-2xl font-bold ${deltaDays > 0 ? "text-red-600" : "text-emerald-600"}`}>{deltaDays > 0 ? `+${deltaDays} days` : "On Schedule"}</p>
            <div className="relative h-4 rounded-full bg-slate-200">
              <div className="absolute left-[10%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-slate-700" />
              <div className="absolute right-[10%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-slate-900" />
              <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 -translate-y-1/2 bg-slate-500" />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function SitePlanSummaryPage() {
  return (
    <QueryProvider>
      <SummaryInner />
    </QueryProvider>
  );
}
