"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPlanRevision, createPlanTask, createTaskUpdate, fetchPlanById, fetchPlanTasks, updatePlanTask } from "@/lib/planner/client";
import { PlanTask, TASK_PRIORITIES, TASK_STATUSES, TaskStatus } from "@/lib/planner/types";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { normalizePercent, statusFromPercent } from "@/lib/planner/validation";

type Mode = "sheet" | "timeline" | "today";

function asDate(value: string | null) {
  return value ? new Date(value) : null;
}

export function PlanWorkspaceClient({ planId, mode }: { planId: string; mode: Mode }) {
  const { summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const userId = summary?.userId ?? null;
  const [planName, setPlanName] = useState("Plan");
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [plan, planTasks] = await Promise.all([fetchPlanById(planId), fetchPlanTasks(planId)]);
    setPlanName(plan?.name ?? "Plan");
    setTasks(planTasks);
  }, [planId]);

  useEffect(() => {
    loadAll().catch((err) => setError(err instanceof Error ? err.message : "Failed to load plan."));
  }, [loadAll]);

  const today = useMemo(() => new Date(), []);
  const dateString = today.toISOString().slice(0, 10);

  const taskBuckets = useMemo(() => {
    const dueToday: PlanTask[] = [];
    const overdue: PlanTask[] = [];
    const thisWeek: PlanTask[] = [];

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    for (const task of tasks) {
      const due = asDate(task.planned_finish);
      if (!due || task.status === "done") continue;
      if (due.toDateString() === today.toDateString()) dueToday.push(task);
      else if (due < today) overdue.push(task);
      else if (due <= weekEnd) thisWeek.push(task);
    }

    return { dueToday, overdue, thisWeek };
  }, [tasks, today]);

  async function handleAddTask() {
    if (!newTitle.trim()) return;
    setSaving("new");
    try {
      await createPlanTask({
        planId,
        title: newTitle.trim(),
        sortOrder: tasks.length,
        userId,
      });
      await createPlanRevision({ planId, revisionType: "task_added", summary: `Added task: ${newTitle.trim()}`, userId });
      setNewTitle("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add task.");
    } finally {
      setSaving(null);
    }
  }

  async function patchTask(taskId: string, patch: Partial<PlanTask>) {
    setSaving(taskId);
    try {
      await updatePlanTask(taskId, { ...patch, updated_by: userId });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task update.");
    } finally {
      setSaving(null);
    }
  }

  async function quickUpdate(task: PlanTask, nextStatus: TaskStatus, percent: number, note?: string) {
    const normalizedPercent = normalizePercent(percent);
    setSaving(task.id);
    try {
      await createTaskUpdate({
        planId,
        taskId: task.id,
        status: nextStatus,
        percentComplete: normalizedPercent,
        note,
        blocked: nextStatus === "blocked",
        userId,
      });

      await updatePlanTask(task.id, {
        status: nextStatus,
        percent_complete: normalizedPercent,
        actual_start: task.actual_start ?? (normalizedPercent > 0 ? new Date().toISOString() : null),
        actual_finish: normalizedPercent >= 100 ? new Date().toISOString() : null,
        updated_by: userId,
      });

      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save update.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-amber-700">Buildstate Planner</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">{planName}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link className={`px-3 py-2 rounded-lg border ${mode === "sheet" ? "bg-slate-900 text-white" : "bg-white"}`} href={`/dashboard/planner/${planId}`}>Sheet</Link>
          <Link className={`px-3 py-2 rounded-lg border ${mode === "timeline" ? "bg-slate-900 text-white" : "bg-white"}`} href={`/dashboard/planner/${planId}/timeline`}>Timeline</Link>
          <Link className={`px-3 py-2 rounded-lg border ${mode === "today" ? "bg-slate-900 text-white" : "bg-white"}`} href={`/dashboard/planner/${planId}/today`}>Today</Link>
        </div>
      </div>

      {error && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-3">{error}</div>}

      {mode === "sheet" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2">Activity</th><th className="text-left p-2">Status</th><th className="text-left p-2">% Done</th><th className="text-left p-2">Priority</th><th className="text-left p-2">Planned start</th><th className="text-left p-2">Planned finish</th><th className="text-left p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-t border-slate-100 align-top">
                  <td className="p-2 min-w-[220px]"><input className="w-full border rounded px-2 py-1" value={task.title} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, title: e.target.value } : t))} onBlur={() => patchTask(task.id, { title: task.title })} /></td>
                  <td className="p-2"><select className="border rounded px-2 py-1" value={task.status} onChange={(e) => patchTask(task.id, { status: e.target.value as TaskStatus })}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
                  <td className="p-2"><input type="number" className="w-20 border rounded px-2 py-1" value={task.percent_complete} onChange={(e) => patchTask(task.id, { percent_complete: Number(e.target.value), status: statusFromPercent(Number(e.target.value), task.status) })} /></td>
                  <td className="p-2"><select className="border rounded px-2 py-1" value={task.priority} onChange={(e) => patchTask(task.id, { priority: e.target.value as PlanTask["priority"] })}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></td>
                  <td className="p-2"><input type="date" className="border rounded px-2 py-1" value={task.planned_start ?? ""} onChange={(e) => patchTask(task.id, { planned_start: e.target.value || null })} /></td>
                  <td className="p-2"><input type="date" className="border rounded px-2 py-1" value={task.planned_finish ?? ""} onChange={(e) => patchTask(task.id, { planned_finish: e.target.value || null })} /></td>
                  <td className="p-2"><textarea className="w-full border rounded px-2 py-1" value={task.notes ?? ""} onChange={(e) => setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, notes: e.target.value } : t))} onBlur={() => patchTask(task.id, { notes: task.notes })} /></td>
                </tr>
              ))}
              <tr className="border-t border-slate-200">
                <td className="p-2"><input className="w-full border rounded px-2 py-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Quick add activity..." /></td>
                <td className="p-2" colSpan={6}><button disabled={saving === "new"} onClick={handleAddTask} className="px-3 py-1.5 rounded bg-amber-500 text-slate-900 font-bold">Add row</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {mode === "timeline" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-slate-500">Simplified timeline (planned dates only).</p>
          {tasks.map((task) => {
            const start = task.planned_start ? new Date(task.planned_start) : null;
            const finish = task.planned_finish ? new Date(task.planned_finish) : null;
            const duration = start && finish ? Math.max(1, Math.ceil((finish.getTime() - start.getTime()) / 86400000) + 1) : 1;
            return (
              <div key={task.id} className="grid grid-cols-[180px_1fr] gap-3 items-center text-sm">
                <div className="font-medium text-slate-700">{task.title}</div>
                <div className="bg-slate-100 rounded h-8 relative overflow-hidden">
                  <div className="absolute inset-y-1 left-2 bg-amber-400 rounded" style={{ width: `${Math.min(100, duration * 5)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "today" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {[{ label: "Overdue", items: taskBuckets.overdue }, { label: "Today", items: taskBuckets.dueToday }, { label: "This week", items: taskBuckets.thisWeek }].map((bucket) => (
              <div key={bucket.label} className="bg-white border border-slate-200 rounded-2xl p-3">
                <h3 className="font-bold text-slate-900">{bucket.label}</h3>
                <div className="space-y-2 mt-2">
                  {bucket.items.map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-200 p-2">
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-500">Status: {task.status} • {task.percent_complete}%</p>
                      <div className="mt-2 flex gap-2 text-xs flex-wrap">
                        <button disabled={saving === task.id} onClick={() => quickUpdate(task, "in-progress", Math.max(task.percent_complete, 25), "Progressed on site") } className="px-2 py-1 rounded bg-blue-100">Progress</button>
                        <button disabled={saving === task.id} onClick={() => quickUpdate(task, "blocked", task.percent_complete, "Blocked on site") } className="px-2 py-1 rounded bg-red-100">Blocked</button>
                        <button disabled={saving === task.id} onClick={() => quickUpdate(task, "done", 100, "Completed on site") } className="px-2 py-1 rounded bg-emerald-100">Done</button>
                      </div>
                    </div>
                  ))}
                  {bucket.items.length === 0 && <p className="text-sm text-slate-500 py-4">No activities in this bucket.</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:hidden">
            <h3 className="font-bold text-slate-900">Mobile quick update ({dateString})</h3>
            <p className="text-sm text-slate-500">Use this view on site to quickly progress activities.</p>
          </div>
        </div>
      )}
    </div>
  );
}
