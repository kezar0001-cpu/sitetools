"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPlanRevision,
  createPlanTask,
  createTaskUpdate,
  deletePlanTask,
  fetchPlanById,
  fetchPlanPhases,
  fetchPlanTasks,
  fetchPublicHolidays,
  bulkCreateTasks,
  updatePlanTask,
} from "@/lib/planner/client";
import { PlanTask, PlanPhase, PublicHoliday, TaskStatus } from "@/lib/planner/types";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { normalizePercent } from "@/lib/planner/validation";
import { ImportedTask } from "@/lib/planner/import-parser";

import { PlannerSheetView } from "./PlannerSheetView";
import { PlannerGanttView } from "./PlannerGanttView";
import { PlannerTodayView } from "./PlannerTodayView";
import { PlannerImportDialog } from "./PlannerImportDialog";

type Mode = "sheet" | "gantt" | "today";

export function PlanWorkspaceClient({ planId, mode }: { planId: string; mode: Mode }) {
  const { summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const userId = summary?.userId ?? null;
  const companyId = summary?.activeMembership?.company_id ?? null;

  const [planName, setPlanName] = useState("Plan");
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [phases, setPhases] = useState<PlanPhase[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  // ── Data loading ──
  const loadAll = useCallback(async () => {
    const [plan, planTasks, planPhases, publicHolidays] = await Promise.all([
      fetchPlanById(planId),
      fetchPlanTasks(planId),
      fetchPlanPhases(planId),
      fetchPublicHolidays(companyId),
    ]);
    setPlanName(plan?.name ?? "Plan");
    setTasks(planTasks);
    setPhases(planPhases);
    setHolidays(publicHolidays);
  }, [planId, companyId]);

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load plan."))
      .finally(() => setLoading(false));
  }, [loadAll]);

  // ── Task operations ──
  const handleAddTask = useCallback(
    async (title: string, phaseId?: string | null) => {
      setSaving("new");
      try {
        await createPlanTask({
          planId,
          title,
          phaseId,
          sortOrder: tasks.length,
          userId,
        });
        await createPlanRevision({
          planId,
          revisionType: "task_added",
          summary: `Added task: ${title}`,
          userId,
        });
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add task.");
      } finally {
        setSaving(null);
      }
    },
    [planId, tasks.length, userId, loadAll]
  );

  const handlePatchTask = useCallback(
    async (taskId: string, patch: Partial<PlanTask>) => {
      setSaving(taskId);
      try {
        await updatePlanTask(taskId, { ...patch, updated_by: userId });
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save task update.");
      } finally {
        setSaving(null);
      }
    },
    [userId, loadAll]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setSaving(taskId);
      try {
        await deletePlanTask(taskId);
        await createPlanRevision({
          planId,
          revisionType: "task_deleted",
          summary: `Deleted a task`,
          userId,
        });
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete task.");
      } finally {
        setSaving(null);
      }
    },
    [planId, userId, loadAll]
  );

  const handleQuickUpdate = useCallback(
    async (task: PlanTask, nextStatus: TaskStatus, percent: number, note?: string) => {
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
    },
    [planId, userId, loadAll]
  );

  // ── Import handler ──
  const handleImport = useCallback(
    async (importedTasks: ImportedTask[], projectName: string | null) => {
      const taskRows = importedTasks.map((t, idx) => ({
        title: t.name,
        sortOrder: tasks.length + idx,
        plannedStart: t.start,
        plannedFinish: t.finish,
        durationDays: t.durationDays,
        indentLevel: t.outlineLevel,
        wbsCode: t.wbsCode,
        notes: t.notes,
      }));

      await bulkCreateTasks(planId, taskRows, userId);
      await createPlanRevision({
        planId,
        revisionType: "import",
        summary: `Imported ${importedTasks.length} tasks${projectName ? ` from "${projectName}"` : ""}`,
        userId,
      });
      await loadAll();
    },
    [planId, tasks.length, userId, loadAll]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const avgPercent = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.percent_complete, 0) / total) : 0;
    return { total, done, blocked, avgPercent };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Plan header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/planner" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              ← All Plans
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{planName}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            {[
              { key: "sheet" as const, label: "Sheet", icon: "▤" },
              { key: "gantt" as const, label: "Gantt", icon: "▰" },
              { key: "today" as const, label: "Today", icon: "◉" },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={
                  tab.key === "sheet"
                    ? `/dashboard/planner/${planId}`
                    : `/dashboard/planner/${planId}/${tab.key}`
                }
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === tab.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:shadow-sm"
                  }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Import button */}
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            📥 Import
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-slate-700" },
          { label: "Completed", value: stats.done, color: "text-emerald-600" },
          { label: "Blocked", value: stats.blocked, color: "text-red-600" },
          { label: "Avg Progress", value: `${stats.avgPercent}%`, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* View content */}
      {mode === "sheet" && (
        <PlannerSheetView
          tasks={tasks}
          phases={phases}
          saving={saving}
          onAddTask={handleAddTask}
          onPatchTask={handlePatchTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {mode === "gantt" && (
        <PlannerGanttView
          tasks={tasks}
          phases={phases}
          holidays={holidays}
        />
      )}

      {mode === "today" && (
        <PlannerTodayView
          tasks={tasks}
          saving={saving}
          onQuickUpdate={handleQuickUpdate}
          onPatchTask={handlePatchTask}
        />
      )}

      {/* Import dialog */}
      {showImport && (
        <PlannerImportDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
