"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTaskHistory } from "./useTaskHistory";
import { useRouter } from "next/navigation";
import {
  createPlanRevision,
  createPlanPhase,
  createPlanTask,
  createTaskUpdate,
  deletePlannerPlan,
  deletePlanPhase,
  deletePlanTask,
  fetchPlanById,
  fetchPlanPhases,
  fetchPlanTasks,
  fetchPublicHolidays,
  bulkCreateTasks,
  logTaskDelayEvent,
  reorderPlanPhases,
  updatePlannerPlan,
  updatePlanPhase,
  updatePlanSites,
  updatePlanTask,
  fetchTaskDependencies,
  createTaskDependency,
  deleteTaskDependency,
} from "@/lib/planner/client";
import { fetchCompanyProjects, fetchCompanySites } from "@/lib/workspace/client";
import { PlanTask, PlanPhase, PublicHoliday, PlannerPlanWithContext, PlanStatus, TaskStatus, DelayType, TaskDependency } from "@/lib/planner/types";
import { Project, Site } from "@/lib/workspace/types";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { normalizePercent } from "@/lib/planner/validation";
import { ImportedTask } from "@/lib/planner/import-parser";
import { exportToMspXml, exportToCsv, exportToXlsx, downloadBlob } from "@/lib/planner/export-msp";

import { PlannerSheetView } from "./PlannerSheetView";
import { PlannerGanttView } from "./PlannerGanttView";
import { PlannerTodayView } from "./PlannerTodayView";
import { PlannerImportDialog } from "./PlannerImportDialog";
import { PlanSettingsPanel } from "./PlanSettingsPanel";
import { PhaseManagerPanel } from "./PhaseManagerPanel";

type Mode = "sheet" | "gantt" | "today";

export function PlanWorkspaceClient({ planId, mode }: { planId: string; mode: Mode }) {
  const router = useRouter();
  const { summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const userId = summary?.userId ?? null;
  const companyId = summary?.activeMembership?.company_id ?? null;

  const [plan, setPlan] = useState<PlannerPlanWithContext | null>(null);
  const { tasks, canUndo, canRedo, dispatch: dispatchTasks, getState: getTaskState } = useTaskHistory();
  const [phases, setPhases] = useState<PlanPhase[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPhaseManager, setShowPhaseManager] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saving" | "saved">("idle");
  const pendingPatchesRef = useRef<Map<string, Partial<PlanTask>>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data loading ──
  const loadAll = useCallback(async () => {
    const [planData, planTasks, planPhases, publicHolidays, planDeps] = await Promise.all([
      fetchPlanById(planId),
      fetchPlanTasks(planId),
      fetchPlanPhases(planId),
      fetchPublicHolidays(companyId),
      fetchTaskDependencies(planId),
    ]);
    setPlan(planData);
    dispatchTasks({ type: "SET_TASKS", tasks: planTasks });
    setPhases(planPhases);
    setHolidays(publicHolidays);
    setDependencies(planDeps);
  }, [planId, companyId, dispatchTasks]);

  const loadProjectsAndSites = useCallback(async () => {
    if (!companyId) return;
    const [nextProjects, nextSites] = await Promise.all([
      fetchCompanyProjects(companyId),
      fetchCompanySites(companyId),
    ]);
    setProjects(nextProjects);
    setSites(nextSites);
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load plan."))
      .finally(() => setLoading(false));
  }, [loadAll]);

  // Lazy-load projects + sites when settings opens
  useEffect(() => {
    if (showSettings) loadProjectsAndSites();
  }, [showSettings, loadProjectsAndSites]);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "pending" || saveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // Flush any remaining pending patches and clear timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ── Plan management ──
  const handleDeletePlan = useCallback(async () => {
    if (!confirm(`Permanently delete "${plan?.name}"? This will delete all tasks, phases and history. This cannot be undone.`)) return;
    setSaving("deleting");
    try {
      await deletePlannerPlan(planId);
      router.push("/dashboard/planner");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete plan.");
      setSaving(null);
    }
  }, [planId, plan?.name, router]);

  const handleUpdateSettings = useCallback(async (
    patch: { name?: string; description?: string; status?: PlanStatus; project_id?: string | null },
    siteIds?: string[] | null
  ) => {
    setSettingsSaving(true);
    try {
      await updatePlannerPlan(planId, { ...patch, updated_by: userId });
      if (siteIds !== null && siteIds !== undefined) {
        await updatePlanSites(planId, siteIds);
      }
      await loadAll();
      setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSettingsSaving(false);
    }
  }, [planId, userId, loadAll]);

  const handleArchive = useCallback(async () => {
    if (!confirm("Archive this plan? It will be hidden from the default list.")) return;
    setSaving("archiving");
    try {
      await updatePlannerPlan(planId, { status: "archived", updated_by: userId });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive plan.");
    } finally {
      setSaving(null);
    }
  }, [planId, userId, loadAll]);

  // ── Phase operations ──
  const handleCreatePhase = useCallback(async (name: string, color: string) => {
    setPhaseSaving(true);
    try {
      await createPlanPhase({ planId, name, color, sortOrder: phases.length, userId });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create phase.");
    } finally {
      setPhaseSaving(false);
    }
  }, [planId, phases.length, userId, loadAll]);

  const handleUpdatePhase = useCallback(async (phaseId: string, patch: { name?: string; color?: string | null }) => {
    setPhaseSaving(true);
    try {
      await updatePlanPhase(phaseId, patch);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update phase.");
    } finally {
      setPhaseSaving(false);
    }
  }, [loadAll]);

  const handleDeletePhase = useCallback(async (phase: { id: string; name: string }) => {
    setPhaseSaving(true);
    try {
      await deletePlanPhase(phase.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete phase.");
    } finally {
      setPhaseSaving(false);
    }
  }, [loadAll]);

  const handleReorderPhases = useCallback(async (orderedIds: string[]) => {
    setPhaseSaving(true);
    try {
      await reorderPlanPhases(orderedIds);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder phases.");
    } finally {
      setPhaseSaving(false);
    }
  }, [loadAll]);

  // ── Dependency operations ──
  const handleCreateDependency = useCallback(async (input: {
    planId: string;
    predecessorTaskId: string;
    successorTaskId: string;
    dependencyType?: "FS" | "FF" | "SS" | "SF";
    lagDays?: number;
  }) => {
    try {
      const dep = await createTaskDependency(input);
      setDependencies(prev => [...prev, dep]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create dependency.");
    }
  }, []);

  const handleDeleteDependency = useCallback(async (dependencyId: string) => {
    try {
      await deleteTaskDependency(dependencyId);
      setDependencies(prev => prev.filter(d => d.id !== dependencyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete dependency.");
    }
  }, []);

  // ── Task operations ──
  const handleAddTask = useCallback(async (title: string, phaseId?: string | null) => {
    setSaving("new");
    try {
      await createPlanTask({ planId, title, phaseId, sortOrder: tasks.length, userId });
      await createPlanRevision({ planId, revisionType: "task_added", summary: `Added task: ${title}`, userId });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add task.");
    } finally {
      setSaving(null);
    }
  }, [planId, tasks.length, userId, loadAll]);

  const flushPendingPatches = useCallback(async () => {
    const patches = new Map(pendingPatchesRef.current);
    if (patches.size === 0) return;
    pendingPatchesRef.current.clear();
    setSaveStatus("saving");
    try {
      await Promise.all(
        Array.from(patches.entries()).map(([id, p]) =>
          updatePlanTask(id, { ...p, updated_by: userId })
        )
      );
      await loadAll();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task.");
      setSaveStatus("idle");
    }
  }, [userId, loadAll]);

  const handlePatchTask = useCallback((taskId: string, patch: Partial<PlanTask>) => {
    // Optimistic local update recorded in history
    dispatchTasks({ type: "PATCH_TASK", taskId, patch });

    // Merge into pending patches for debounced server sync
    const existing = pendingPatchesRef.current.get(taskId) ?? {};
    pendingPatchesRef.current.set(taskId, { ...existing, ...patch });
    setSaveStatus("pending");

    // Reset 2-second debounce timer
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushPendingPatches, 2000);
  }, [dispatchTasks, flushPendingPatches]);

  // ── Undo / Redo ──
  const queueSyncForTaskDiff = useCallback((prevTasks: PlanTask[], currentTasks: PlanTask[]) => {
    let changed = false;
    for (const prevTask of prevTasks) {
      const curr = currentTasks.find((t) => t.id === prevTask.id);
      if (!curr) continue;
      if (JSON.stringify(curr) !== JSON.stringify(prevTask)) {
        // Store full previous task as the patch to restore it
        const { id, ...rest } = prevTask;
        const existing = pendingPatchesRef.current.get(id) ?? {};
        pendingPatchesRef.current.set(id, { ...existing, ...rest });
        changed = true;
      }
    }
    if (changed) {
      setSaveStatus("pending");
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(flushPendingPatches, 2000);
    }
  }, [flushPendingPatches]);

  const handleUndo = useCallback(() => {
    const { past, tasks: currentTasks } = getTaskState();
    if (past.length === 0) return;
    const prevTasks = past[past.length - 1];
    dispatchTasks({ type: "UNDO" });
    queueSyncForTaskDiff(prevTasks, currentTasks);
  }, [getTaskState, dispatchTasks, queueSyncForTaskDiff]);

  const handleRedo = useCallback(() => {
    const { future, tasks: currentTasks } = getTaskState();
    if (future.length === 0) return;
    const nextTasks = future[0];
    dispatchTasks({ type: "REDO" });
    queueSyncForTaskDiff(nextTasks, currentTasks);
  }, [getTaskState, dispatchTasks, queueSyncForTaskDiff]);

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key !== "z" && e.key !== "Z") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setSaving(taskId);
    try {
      await deletePlanTask(taskId);
      await createPlanRevision({ planId, revisionType: "task_deleted", summary: "Deleted a task", userId });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    } finally {
      setSaving(null);
    }
  }, [planId, userId, loadAll]);

  const handleQuickUpdate = useCallback(async (task: PlanTask, nextStatus: TaskStatus, percent: number, note?: string) => {
    setSaving(task.id);
    try {
      const normPct = normalizePercent(percent);
      await createTaskUpdate({
        planId,
        taskId: task.id,
        status: nextStatus,
        percentComplete: normPct,
        note,
        blocked: nextStatus === "blocked",
        userId,
      });
      await updatePlanTask(task.id, {
        status: nextStatus,
        percent_complete: normPct,
        actual_start: task.actual_start ?? (normPct > 0 ? new Date().toISOString() : null),
        actual_finish: normPct >= 100 ? new Date().toISOString() : null,
        updated_by: userId,
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save update.");
    } finally {
      setSaving(null);
    }
  }, [planId, userId, loadAll]);

  const handleLogDelay = useCallback(async (input: {
    task: PlanTask;
    delayType: DelayType;
    delayReason?: string;
    councilWaitingOn?: string;
    weatherHoursLost?: number;
  }) => {
    setSaving(input.task.id);
    try {
      await logTaskDelayEvent({
        planId,
        taskId: input.task.id,
        delayType: input.delayType,
        delayReason: input.delayReason,
        councilWaitingOn: input.councilWaitingOn,
        weatherHoursLost: input.weatherHoursLost,
        userId,
      });
      await createPlanRevision({
        planId,
        revisionType: "delay_logged",
        summary: `Delay logged on task: ${input.task.title}`,
        payload: {
          delayType: input.delayType,
          weatherHoursLost: input.weatherHoursLost ?? null,
        },
        userId,
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log delay.");
    } finally {
      setSaving(null);
    }
  }, [planId, userId, loadAll]);

  // ── Import ──
  const handleImport = useCallback(async (importedTasks: ImportedTask[], projectName: string | null) => {
    const taskRows = importedTasks.map((t, idx) => ({
      title: t.name,
      sortOrder: tasks.length + idx,
      plannedStart: t.start,
      plannedFinish: t.finish,
      durationDays: t.durationDays,
      indentLevel: t.outlineLevel,
      wbsCode: t.wbsCode,
      notes: t.notes,
      percentComplete: t.percentComplete,
    }));
    await bulkCreateTasks(planId, taskRows, userId);
    await createPlanRevision({
      planId,
      revisionType: "import",
      summary: `Imported ${importedTasks.length} tasks${projectName ? ` from "${projectName}"` : ""}`,
      userId,
    });
    await loadAll();
  }, [planId, tasks.length, userId, loadAll]);

  // ── Export ──
  const handleExport = useCallback(async (format: "xml" | "xlsx" | "csv") => {
    if (!plan) return;
    setExporting(true);
    try {
      const safeName = plan.name.replace(/[^a-z0-9_\-]/gi, "_");
      switch (format) {
        case "xml": {
          const xml = exportToMspXml(plan, tasks, phases);
          downloadBlob(xml, `${safeName}.xml`, "application/xml");
          break;
        }
        case "xlsx": {
          const xlsx = exportToXlsx(plan, tasks, phases);
          downloadBlob(xlsx, `${safeName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          break;
        }
        case "csv": {
          const csv = exportToCsv(plan, tasks, phases);
          downloadBlob(csv, `${safeName}.csv`, "text/csv");
          break;
        }
      }
    } finally {
      setExporting(false);
    }
  }, [plan, tasks, phases]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const late = tasks.filter((t) => t.actual_finish && t.planned_finish && t.actual_finish.slice(0, 10) > t.planned_finish).length;
    const avgPercent = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.percent_complete, 0) / total) : 0;
    return { total, done, blocked, late, avgPercent };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const planName = plan?.name ?? "Plan";
  const isArchived = plan?.status === "archived";

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Plan header */}
      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="min-w-0">
          <Link href="/dashboard/planner" className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1">
            ← Plans
          </Link>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="truncate max-w-[220px] md:max-w-none">{planName}</span>
            {isArchived && (
              <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Archived</span>
            )}
            {saveStatus !== "idle" && (
              <span className={`text-xs font-medium transition-colors ${saveStatus === "saved" ? "text-emerald-600" : "text-amber-500"}`}>
                {saveStatus === "saved" ? (
                  "✓ Saved"
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                )}
              </span>
            )}
          </h1>
          {plan?.projects?.name && (
            <p className="text-xs text-slate-400 mt-0.5">{plan.projects.name}</p>
          )}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            {[
              { key: "sheet" as const, label: "Plan",  icon: "▤" },
              { key: "gantt" as const, label: "Gantt", icon: "▰" },
              { key: "today" as const, label: "Site",  icon: "◉" },
            ].map((tab) => (
              <Link
                key={tab.key}
                href={tab.key === "sheet" ? `/dashboard/planner/${planId}` : `/dashboard/planner/${planId}/${tab.key}`}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === tab.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:shadow-sm"
                  }`}
              >
                <span className="mr-1.5">{tab.icon}</span>{tab.label}
              </Link>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowPhaseManager(true)}
            className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
              showPhaseManager
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
            }`}
            title="Manage phases"
          >
            ◧ Phases
            {phases.length > 0 && (
              <span className="ml-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {phases.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            title="Import .xml / CSV"
          >
            📥 Import
          </button>
          {/* Export dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-40 flex items-center gap-1"
              title="Export plan"
            >
              {exporting ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : "📤"} Export ▾
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-52 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Export as
              </div>
              <button
                onClick={() => handleExport("xml")}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-start gap-2"
              >
                <span className="text-base leading-none mt-0.5">📋</span>
                <div>
                  <p className="font-semibold">MS Project XML</p>
                  <p className="text-xs text-slate-400">Open in Microsoft Project</p>
                </div>
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-start gap-2 border-t border-slate-100"
              >
                <span className="text-base leading-none mt-0.5">📊</span>
                <div>
                  <p className="font-semibold">Excel (.xlsx)</p>
                  <p className="text-xs text-slate-400">All tasks with all columns</p>
                </div>
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-start gap-2 border-t border-slate-100"
              >
                <span className="text-base leading-none mt-0.5">📄</span>
                <div>
                  <p className="font-semibold">CSV</p>
                  <p className="text-xs text-slate-400">Flat file for any tool</p>
                </div>
              </button>
              <Link
                href={`/dashboard/planner/${planId}/print`}
                target="_blank"
                className="flex items-start gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                <span className="text-base leading-none mt-0.5">🖨</span>
                <div>
                  <p className="font-semibold">Print / PDF</p>
                  <p className="text-xs text-slate-400">Browser print dialog</p>
                </div>
              </Link>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            title="Plan settings"
          >
            ⚙ Settings
          </button>

          {/* Archive / Delete dropdown */}
          <div className="relative group">
            <button className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors">
              ···
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity overflow-hidden">
              {!isArchived && (
                <button
                  onClick={handleArchive}
                  disabled={!!saving}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  📦 Archive plan
                </button>
              )}
              {isArchived && (
                <button
                  onClick={() => handleUpdateSettings({ status: "active" })}
                  disabled={settingsSaving}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  ↺ Unarchive
                </button>
              )}
              <button
                onClick={handleDeletePlan}
                disabled={saving === "deleting"}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-100"
              >
                🗑 Delete plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-slate-700" },
          { label: "Completed", value: stats.done, color: "text-emerald-600" },
          { label: "Blocked", value: stats.blocked, color: "text-red-600" },
          { label: "Late (Actual > Plan)", value: stats.late, color: "text-orange-600" },
          { label: "Avg Progress", value: `${stats.avgPercent}%`, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {/* View content */}
      {mode === "sheet" && (
        <PlannerSheetView
          tasks={tasks}
          phases={phases}
          saving={saving}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAddTask={handleAddTask}
          onPatchTask={handlePatchTask}
          onDeleteTask={handleDeleteTask}
          onOpenPhaseManager={() => setShowPhaseManager(true)}
          dependencies={dependencies}
          planId={planId}
          onCreateDependency={handleCreateDependency}
          onDeleteDependency={handleDeleteDependency}
        />
      )}
      {mode === "gantt" && (
        <PlannerGanttView tasks={tasks} phases={phases} holidays={holidays} dependencies={dependencies} />
      )}
      {mode === "today" && (
        <PlannerTodayView
          tasks={tasks}
          phases={phases}
          saving={saving}
          onQuickUpdate={handleQuickUpdate}
          onLogDelay={handleLogDelay}
        />
      )}

      {/* Modals */}
      {showImport && (
        <PlannerImportDialog onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
      {showSettings && plan && (
        <PlanSettingsPanel
          plan={plan}
          projects={projects}
          sites={sites}
          saving={settingsSaving}
          onUpdate={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Phase Manager — slide-over panel, independent of view mode */}
      <PhaseManagerPanel
        open={showPhaseManager}
        phases={phases}
        tasks={tasks}
        saving={phaseSaving}
        onClose={() => setShowPhaseManager(false)}
        onCreate={handleCreatePhase}
        onUpdate={handleUpdatePhase}
        onDelete={handleDeletePhase}
        onReorder={handleReorderPhases}
      />
    </div>
  );
}
