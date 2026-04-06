import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { SitePlanDelayLog, SitePlanTask } from "@/types/siteplan";

interface BaselineRow {
  id: string;
  created_at: string;
  snapshot: SitePlanTask[];
}

interface SummaryPageProps {
  params: {
    projectId: string;
  };
}

interface PhaseProgressRow {
  id: string;
  name: string;
  progress: number;
  completeCount: number;
  totalCount: number;
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function formatDate(dateISO: string | null): string {
  if (!dateISO) return "—";
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildChildrenMap(tasks: SitePlanTask[]): Map<string, SitePlanTask[]> {
  const map = new Map<string, SitePlanTask[]>();
  for (const task of tasks) {
    if (!task.parent_id) continue;
    const current = map.get(task.parent_id) ?? [];
    current.push(task);
    map.set(task.parent_id, current);
  }
  return map;
}

function getDescendants(taskId: string, childrenMap: Map<string, SitePlanTask[]>): SitePlanTask[] {
  const result: SitePlanTask[] = [];
  const stack = [...(childrenMap.get(taskId) ?? [])];

  while (stack.length > 0) {
    const task = stack.pop();
    if (!task) continue;
    result.push(task);
    const children = childrenMap.get(task.id) ?? [];
    for (const child of children) stack.push(child);
  }

  return result;
}

export default async function SitePlanSummaryPage({ params }: SummaryPageProps) {
  const projectId = params.projectId;

  const [{ data: tasks, error: tasksError }, { data: delayLogs, error: logsError }, { data: baselines, error: baselinesError }] =
    await Promise.all([
      supabase
        .from("siteplan_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("siteplan_delay_logs")
        .select("*")
        .eq("project_id", projectId),
      supabase
        .from("siteplan_baselines")
        .select("id, created_at, snapshot")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
    ]);

  if (tasksError || logsError || baselinesError) {
    throw new Error(tasksError?.message ?? logsError?.message ?? baselinesError?.message ?? "Failed to load summary data");
  }

  const taskList = (tasks ?? []) as SitePlanTask[];
  const logList = (delayLogs ?? []) as SitePlanDelayLog[];
  const baselineList = (baselines ?? []) as BaselineRow[];

  if (taskList.length === 0) {
    notFound();
  }

  const totalTasks = taskList.length;
  const completedTasks = taskList.filter((task) => task.status === "completed" || task.progress >= 100).length;
  const delayedTaskCount = new Set(logList.map((log) => log.task_id)).size;
  const pushedDays = logList
    .filter((log) => log.impacts_completion)
    .reduce((sum, log) => sum + Math.max(0, log.delay_days), 0);
  const onTrack = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const childrenMap = buildChildrenMap(taskList);
  const rootTasks = taskList.filter((task) => task.parent_id === null);

  const phaseProgressRows: PhaseProgressRow[] = rootTasks.map((root) => {
    const descendants = getDescendants(root.id, childrenMap);
    const scopedTasks = descendants.length > 0 ? descendants : [root];
    const phaseTotal = scopedTasks.length;
    const phaseComplete = scopedTasks.filter((task) => task.status === "completed" || task.progress >= 100).length;
    const progress = phaseTotal > 0 ? Math.round((phaseComplete / phaseTotal) * 100) : 0;

    return {
      id: root.id,
      name: root.name,
      progress,
      completeCount: phaseComplete,
      totalCount: phaseTotal,
    };
  });

  phaseProgressRows.sort((a, b) => a.progress - b.progress || a.name.localeCompare(b.name));

  const delayByCategoryMap = new Map<string, { count: number; totalDays: number }>();
  for (const log of logList) {
    const key = log.delay_category || "Other";
    const current = delayByCategoryMap.get(key) ?? { count: 0, totalDays: 0 };
    current.count += 1;
    current.totalDays += Math.max(0, log.delay_days);
    delayByCategoryMap.set(key, current);
  }

  const delayBreakdown = Array.from(delayByCategoryMap.entries())
    .map(([category, metrics]) => ({ category, ...metrics }))
    .sort((a, b) => b.totalDays - a.totalDays || b.count - a.count);

  const maxDelayDays = delayBreakdown[0]?.totalDays ?? 0;

  const baselineSnapshot = baselineList[0]?.snapshot ?? [];
  const baselineEndISO = baselineSnapshot.length
    ? baselineSnapshot.reduce((latest, task) => (task.end_date > latest ? task.end_date : latest), baselineSnapshot[0].end_date)
    : null;

  const forecastEndISO = taskList.reduce(
    (latest, task) => (task.end_date > latest ? task.end_date : latest),
    taskList[0]?.end_date ?? "",
  );

  const baselineDate = baselineEndISO ? new Date(baselineEndISO) : null;
  const forecastDate = forecastEndISO ? new Date(forecastEndISO) : null;
  const impactDays = baselineDate && forecastDate ? daysBetween(baselineDate, forecastDate) : 0;
  const visualShift = Math.min(100, Math.abs(impactDays) * 4);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Site Plan</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Program Summary</h1>
          </div>
          <Link href={`/site-plan/${projectId}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Back to Plan
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tasks Complete</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{completedTasks}/{totalTasks}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delayed</p>
            <p className="mt-2 text-3xl font-semibold text-amber-600">{delayedTaskCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program Pushed</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600">+{pushedDays}d</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On Track</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{onTrack}%</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Phase Progress</h2>
          <div className="mt-4 space-y-4">
            {phaseProgressRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[minmax(12rem,1fr)_minmax(8rem,2fr)_4rem_auto] items-center gap-3">
                <p className="truncate text-sm font-medium text-slate-700">{row.name}</p>
                <div className="h-3 w-full rounded-full bg-slate-200">
                  <div className="h-3 rounded-full bg-blue-500" style={{ width: `${row.progress}%` }} />
                </div>
                <p className="text-sm font-semibold text-slate-700">{row.progress}%</p>
                <p className="text-right text-xs text-slate-500">{row.completeCount}/{row.totalCount} tasks complete</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Delay Breakdown</h2>
          <div className="mt-4 space-y-3">
            {delayBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No delay logs recorded for this project.</p>
            ) : (
              delayBreakdown.map((entry) => {
                const width = maxDelayDays > 0 ? Math.round((entry.totalDays / maxDelayDays) * 100) : 0;
                return (
                  <div key={entry.category} className="grid grid-cols-[minmax(9rem,1fr)_4rem_6rem_minmax(8rem,1fr)] items-center gap-3">
                    <p className="text-sm font-medium text-slate-700">{entry.category}</p>
                    <p className="text-sm text-slate-600">{entry.count}</p>
                    <p className="text-sm text-slate-600">{entry.totalDays} days</p>
                    <div className="h-3 w-full rounded-full bg-slate-200">
                      <div className="h-3 rounded-full bg-amber-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Programme Impact</h2>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1 text-sm text-slate-600">
              <p>Original end: <span className="font-semibold text-slate-900">{formatDate(baselineEndISO)}</span></p>
              <p>Forecast end: <span className="font-semibold text-slate-900">{formatDate(forecastEndISO || null)}</span></p>
            </div>
            <div className={`text-3xl font-bold ${impactDays > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {impactDays > 0 ? `+${impactDays} days` : impactDays < 0 ? `${impactDays} days` : "On schedule"}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="relative h-4 rounded-full bg-slate-200">
              <div className="absolute inset-y-0 left-0 w-1 rounded-full bg-slate-500" />
              <div
                className={`absolute inset-y-0 rounded-full ${impactDays > 0 ? "bg-rose-500/80" : "bg-emerald-500/80"}`}
                style={{
                  left: impactDays >= 0 ? "0%" : `${Math.max(0, 100 - visualShift)}%`,
                  width: `${Math.max(2, visualShift)}%`,
                }}
              />
              <div className="absolute inset-y-0 right-0 w-1 rounded-full bg-slate-900" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Original</span>
              <span>Forecast shift</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
