"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PlanTask, PlanPhase,
  TASK_STATUSES, TASK_PRIORITIES,
  TaskStatus, TaskPriority, DelayType, DELAY_TYPES, DELAY_TYPE_LABELS,
  STATUS_COLORS, PRIORITY_COLORS,
  TaskDependency,
} from "@/lib/planner/types";
import { statusFromPercent } from "@/lib/planner/validation";

// ── Column definitions ──
const COL_DEFS = [
  { key: "dependencies", label: "Dependencies", width: 140, defaultOn: true },
  { key: "duration",      label: "Duration",      width: 88,   defaultOn: true  },
  { key: "start",         label: "Start",          width: 108,  defaultOn: true  },
  { key: "finish",        label: "Finish",         width: 108,  defaultOn: true  },
  { key: "status",        label: "Status",         width: 130,  defaultOn: true  },
  { key: "percent",       label: "Progress",       width: 120,  defaultOn: true  },
  { key: "actual_start",  label: "Act. Start",     width: 108,  defaultOn: false },
  { key: "actual_finish", label: "Act. Finish",    width: 108,  defaultOn: false },
  { key: "variance",      label: "Variance",       width: 88,   defaultOn: false },
  { key: "priority",      label: "Priority",       width: 100,  defaultOn: false },
  { key: "delay",         label: "Delay",          width: 120,  defaultOn: false },
  { key: "notes",         label: "Notes",          width: 180,  defaultOn: false },
] as const;

type ColKey = typeof COL_DEFS[number]["key"];

const STORAGE_KEY = "siteplan-sheet-cols-v2";

function loadSavedCols(): Set<ColKey> {
  try {
    const s = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (s) return new Set(JSON.parse(s) as ColKey[]);
  } catch { /* ignore */ }
  return new Set(COL_DEFS.filter(c => c.defaultOn).map(c => c.key));
}

// ── Status cycle ──
const STATUS_CYCLE: TaskStatus[] = ["not-started", "in-progress", "blocked", "done"];
const STATUS_PILL: Record<TaskStatus, string> = {
  "not-started": "bg-slate-100 text-slate-600 hover:bg-slate-200",
  "in-progress": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "blocked":     "bg-red-100 text-red-700 hover:bg-red-200",
  "done":        "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "blocked":     "Blocked",
  "done":        "Done",
};

function darkenColor(hex: string, factor = 0.65): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// ── Props ──
interface Props {
  tasks: PlanTask[];
  phases: PlanPhase[];
  saving: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddTask: (title: string, phaseId?: string | null) => Promise<void>;
  onPatchTask: (taskId: string, patch: Partial<PlanTask>) => void | Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenPhaseManager: () => void;
  dependencies?: TaskDependency[];
}

// ── Main component ──
export function PlannerSheetView({
  tasks, phases, saving,
  canUndo, canRedo, onUndo, onRedo,
  onAddTask, onPatchTask, onDeleteTask,
  onOpenPhaseManager,
  dependencies,
}: Props) {
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(loadSavedCols);
  const [showColPicker, setShowColPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPhase,  setFilterPhase]  = useState<string>("all");
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [detailTask,   setDetailTask]   = useState<PlanTask | null>(null);
  const [editingCell,  setEditingCell]  = useState<{ taskId: string; field: string } | null>(null);
  const [localValues,  setLocalValues]  = useState<Record<string, Record<string, string>>>({});
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Close col picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    }
    if (showColPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColPicker]);

  // Keep detail task in sync when tasks refresh
  useEffect(() => {
    if (!detailTask) return;
    const refreshed = tasks.find(t => t.id === detailTask.id);
    if (refreshed) setDetailTask(refreshed);
  }, [tasks, detailTask]);

  // Toggle column visibility
  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  // Filtered + sorted task list
  const processedTasks = useMemo(() => {
    let list = [...tasks];
    if (filterStatus !== "all") list = list.filter(t => t.status === filterStatus);
    if (filterPhase === "none") list = list.filter(t => !t.phase_id);
    else if (filterPhase !== "all") list = list.filter(t => t.phase_id === filterPhase);
    return list;
  }, [tasks, filterStatus, filterPhase]);

  // Group by phase preserving phase sort order
  const grouped = useMemo(() => {
    const map = new Map<string, { phase: PlanPhase | null; tasks: PlanTask[] }>();
    for (const p of phases) map.set(p.id, { phase: p, tasks: [] });
    map.set("__none__", { phase: null, tasks: [] });
    for (const t of processedTasks) {
      const k = t.phase_id ?? "__none__";
      const g = map.get(k);
      if (g) g.tasks.push(t);
      else map.set(k, { phase: null, tasks: [t] });
    }
    return Array.from(map.entries())
      .filter(([, g]) => g.tasks.length > 0 || g.phase !== null)
      .sort(([, a], [, b]) => (a.phase?.sort_order ?? 9999) - (b.phase?.sort_order ?? 9999));
  }, [processedTasks, phases]);

  // Inline edit helpers
  const startEdit = (taskId: string, field: string, value: string) => {
    setEditingCell({ taskId, field });
    setLocalValues(p => ({ ...p, [taskId]: { ...p[taskId], [field]: value } }));
  };
  const getLV = (taskId: string, field: string, fallback: string) =>
    localValues[taskId]?.[field] ?? fallback;
  const setLV = (taskId: string, field: string, value: string) =>
    setLocalValues(p => ({ ...p, [taskId]: { ...p[taskId], [field]: value } }));

  const commitEdit = useCallback(async (taskId: string, field: string, task: PlanTask) => {
    const value = localValues[taskId]?.[field] ?? "";
    setEditingCell(null);
    setLocalValues(p => { const n = { ...p }; delete n[taskId]; return n; });
    const patches: Record<string, Partial<PlanTask>> = {
      title:          { title: value || task.title },
      planned_start:  { planned_start: value || null },
      planned_finish: { planned_finish: value || null },
      actual_start:   { actual_start: value || null },
      actual_finish:  { actual_finish: value || null },
      notes:          { notes: value || null },
    };
    const patch = patches[field];
    if (patch) {
      const changed = Object.entries(patch).some(([k, v]) => (task as unknown as Record<string, unknown>)[k] !== v);
      if (changed) await onPatchTask(taskId, patch);
    }
  }, [localValues, onPatchTask]);

  const handleKD = (e: React.KeyboardEvent, taskId: string, field: string, task: PlanTask) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(taskId, field, task); }
    if (e.key === "Escape") {
      setEditingCell(null);
      setLocalValues(p => { const n = { ...p }; delete n[taskId]; return n; });
    }
  };

  const isEditing = (taskId: string, field: string) =>
    editingCell?.taskId === taskId && editingCell.field === field;

  // Determine visible columns list in order
  const activeCols = COL_DEFS.filter(c => visibleCols.has(c.key));

  // All-task row number
  const rowNum = (task: PlanTask) => tasks.findIndex(t => t.id === task.id) + 1;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 lg:px-4 lg:py-2.5">
        {/* Top row on mobile: Status filter and phase filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-fit">Status</span>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-amber-400 outline-none min-w-[120px] touch-manipulation"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as TaskStatus | "all")}
            >
              <option value="all">All</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {/* Phase filter — swatches with better mobile touch targets */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-fit">Phase</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterPhase("all")}
                className={`text-xs px-3 py-2 rounded-full font-medium transition-colors min-h-[32px] touch-manipulation ${filterPhase === "all" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
              >
                All
              </button>
              {phases.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterPhase(filterPhase === p.id ? "all" : p.id)}
                  title={p.name}
                  className={`w-8 h-8 md:w-5 md:h-5 rounded-full transition-all hover:scale-110 flex-shrink-0 min-h-[32px] md:min-h-0 touch-manipulation ${filterPhase === p.id ? "ring-2 ring-offset-1 ring-slate-600 scale-110" : ""}`}
                  style={{ backgroundColor: p.color ?? "#64748b" }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row on mobile: Actions and counters */}
        <div className="flex flex-col sm:flex-row lg:flex-row lg:ml-auto gap-3 lg:gap-2">
          <div className="flex items-center justify-between lg:justify-start gap-2">
            <span className="text-xs text-slate-400">
              {processedTasks.length} task{processedTasks.length !== 1 ? "s" : ""}
              {filterStatus !== "all" || filterPhase !== "all" ? " filtered" : ""}
            </span>

            {/* Undo / Redo with larger touch targets on mobile */}
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[36px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[36px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Phases button with larger touch target */}
          <button
            onClick={onOpenPhaseManager}
            className="flex items-center justify-center gap-2 px-4 py-2 lg:px-3 lg:py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors touch-manipulation min-h-[36px]"
          >
            <span className="text-lg lg:text-base">◧</span>
            <span className="hidden sm:inline">Phases</span>
            {phases.length > 0 && (
              <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 lg:px-1.5 lg:py-0.5 rounded-full leading-none">
                {phases.length}
              </span>
            )}
          </button>

          {/* Column picker with mobile-friendly positioning */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              className={`flex items-center justify-center gap-2 px-4 py-2 lg:px-3 lg:py-1.5 rounded-lg border text-sm font-semibold transition-colors touch-manipulation min-h-[36px] ${
                showColPicker
                  ? "border-slate-400 bg-slate-100 text-slate-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Show/hide columns"
            >
              <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className="hidden lg:inline">Columns</span>
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 w-52 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Toggle columns</p>
                <div className="space-y-1">
                  {COL_DEFS.map(col => (
                    <label key={col.key} className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={visibleCols.has(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="accent-amber-500 w-3.5 h-3.5"
                      />
                      <span className="text-sm text-slate-700">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sheet table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <table className="w-full text-sm min-w-[800px] md:min-w-0">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="w-10 p-2.5 text-center">#</th>
                <th className="text-left p-2.5 min-w-[200px] md:min-w-[240px]">Task Name</th>
                {activeCols.map(col => (
                  <th key={col.key} className="text-left p-2.5 hidden md:table-cell" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                {/* Mobile: Show essential columns */}
                {activeCols.slice(0, 2).map(col => (
                  <th key={`${col.key}-mobile`} className="text-left p-2.5 md:hidden" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                <th className="w-10 p-2.5" />
              </tr>
            </thead>
            <tbody>
              {grouped.map(([phaseKey, { phase, tasks: pTasks }]) => (
                <PhaseSection
                  key={phaseKey}
                  phase={phase}
                  tasks={pTasks}
                  activeCols={activeCols}
                  collapsed={collapsedPhases.has(phaseKey)}
                  onToggleCollapse={() => {
                    setCollapsedPhases(prev => {
                      const n = new Set(prev);
                      if (n.has(phaseKey)) n.delete(phaseKey); else n.add(phaseKey);
                      return n;
                    });
                  }}
                  saving={saving}
                  isEditing={isEditing}
                  getLV={getLV}
                  setLV={setLV}
                  startEdit={startEdit}
                  commitEdit={commitEdit}
                  handleKD={handleKD}
                  onPatchTask={onPatchTask}
                  onDeleteTask={onDeleteTask}
                  onAddTask={onAddTask}
                  onOpenDetail={setDetailTask}
                  rowNum={rowNum}
                />
              ))}

              {/* Quick-add row */}
              <QuickAddRow
                phases={phases}
                onAdd={onAddTask}
                saving={saving === "new"}
                colCount={activeCols.length}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Task detail panel ── */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          phases={phases}
          saving={saving === detailTask.id}
          onPatch={(patch) => onPatchTask(detailTask.id, patch)}
          onDelete={() => { setDetailTask(null); onDeleteTask(detailTask.id); }}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  );
}

// ── Phase section ──
function PhaseSection({
  phase, tasks, activeCols, collapsed,
  onToggleCollapse, saving, isEditing, getLV, setLV,
  startEdit, commitEdit, handleKD, onPatchTask, onDeleteTask,
  onAddTask, onOpenDetail, rowNum, dependencies,
}: {
  phase: PlanPhase | null;
  tasks: PlanTask[];
  activeCols: typeof COL_DEFS[number][];
  collapsed: boolean;
  onToggleCollapse: () => void;
  saving: string | null;
  isEditing: (taskId: string, field: string) => boolean;
  getLV: (taskId: string, field: string, fallback: string) => string;
  setLV: (taskId: string, field: string, value: string) => void;
  startEdit: (taskId: string, field: string, value: string) => void;
  commitEdit: (taskId: string, field: string, task: PlanTask) => Promise<void>;
  handleKD: (e: React.KeyboardEvent, taskId: string, field: string, task: PlanTask) => void;
  onPatchTask: (taskId: string, patch: Partial<PlanTask>) => void | Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddTask: (title: string, phaseId?: string | null) => Promise<void>;
  onOpenDetail: (task: PlanTask) => void;
  rowNum: (task: PlanTask) => number;
  dependencies?: TaskDependency[];
}) {
  const pct = tasks.length > 0
    ? Math.round(tasks.reduce((s, t) => s + t.percent_complete, 0) / tasks.length)
    : 0;
  const colSpanTotal = 2 + activeCols.length + 1; // # + task + activeCols + actions

  return (
    <>
      {phase && (
        <tr
          className="cursor-pointer select-none group/ph"
          style={{ backgroundColor: phase.color ? `${phase.color}12` : "#f1f5f9" }}
          onClick={onToggleCollapse}
        >
          <td
            className="p-0"
            style={{ borderLeft: `3px solid ${phase.color ?? "#94a3b8"}` }}
          />
          <td className="py-2 pl-2 pr-1 text-xs" style={{ color: phase.color ? darkenColor(phase.color) : "#64748b" }}>
            <span className="mr-1.5 text-[10px]">{collapsed ? "▶" : "▼"}</span>
          </td>
          <td colSpan={colSpanTotal - 2} className="py-2 pr-3">
            <div className="flex items-center gap-3">
              <span
                className="font-bold text-sm"
                style={{ color: phase.color ? darkenColor(phase.color) : "#334155" }}
              >
                {phase.name}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {pct}%
              </span>
              {/* Mini progress bar */}
              {tasks.length > 0 && (
                <div className="w-20 h-1.5 bg-black/10 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: phase.color ?? "#94a3b8" }}
                  />
                </div>
              )}
              {/* Hover add-task button */}
              <button
                onClick={e => { e.stopPropagation(); onAddTask("New task", phase.id); }}
                className="opacity-0 group-hover/ph:opacity-100 ml-auto text-xs px-2 py-1 rounded-lg transition-all font-semibold"
                style={{ color: phase.color ? darkenColor(phase.color) : "#64748b", backgroundColor: phase.color ? `${phase.color}20` : "#e2e8f0" }}
              >
                + Add task
              </button>
            </div>
          </td>
        </tr>
      )}

      {!collapsed && tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          rowNum={rowNum(task)}
          activeCols={activeCols}
          saving={saving}
          isEditing={isEditing}
          getLV={getLV}
          setLV={setLV}
          startEdit={startEdit}
          commitEdit={commitEdit}
          handleKD={handleKD}
          onPatchTask={onPatchTask}
          onDeleteTask={onDeleteTask}
          onOpenDetail={onOpenDetail}
          phaseColor={phase?.color ?? null}
        />
      ))}

      {/* Per-phase add row (always visible at bottom of phase) */}
      {!collapsed && phase && (
        <PhaseAddRow phaseId={phase.id} phaseName={phase.name} phaseColor={phase.color} onAdd={onAddTask} saving={saving} />
      )}
    </>
  );
}

// ── Per-phase add row ──
function PhaseAddRow({ phaseId, phaseName, phaseColor, onAdd, saving }: {
  phaseId: string; phaseName: string; phaseColor: string | null;
  onAdd: (title: string, phaseId?: string | null) => Promise<void>;
  saving: string | null;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try { await onAdd(title.trim(), phaseId); setTitle(""); }
    finally { setBusy(false); }
  };

  return (
    <tr className="border-t border-dashed border-slate-100">
      <td
        className="p-0 w-1"
        style={{ borderLeft: `3px solid ${phaseColor ?? "#e2e8f0"}` }}
      />
      <td />
      <td colSpan={99} className="py-1.5 pr-3">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 text-sm text-slate-600 placeholder-slate-300 bg-transparent outline-none border-b border-transparent focus:border-slate-300 py-1 transition-colors"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder={`+ Add task to ${phaseName}…`}
            disabled={busy || !!saving}
          />
          {title.trim() && (
            <button
              onClick={submit}
              disabled={busy || !!saving}
              className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: phaseColor ? `${phaseColor}20` : "#f1f5f9", color: phaseColor ? darkenColor(phaseColor) : "#64748b" }}
            >
              {busy ? "…" : "Add"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Task row ──
function TaskRow({
  task, rowNum, activeCols, saving,
  isEditing, getLV, setLV, startEdit, commitEdit, handleKD,
  onPatchTask, onDeleteTask, onOpenDetail, phaseColor,
}: {
  task: PlanTask;
  rowNum: number;
  activeCols: typeof COL_DEFS[number][];
  saving: string | null;
  isEditing: (taskId: string, field: string) => boolean;
  getLV: (taskId: string, field: string, fallback: string) => string;
  setLV: (taskId: string, field: string, value: string) => void;
  startEdit: (taskId: string, field: string, value: string) => void;
  commitEdit: (taskId: string, field: string, task: PlanTask) => Promise<void>;
  handleKD: (e: React.KeyboardEvent, taskId: string, field: string, task: PlanTask) => void;
  onPatchTask: (taskId: string, patch: Partial<PlanTask>) => void | Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenDetail: (task: PlanTask) => void;
  phaseColor: string | null;
}) {
  const isSaving = saving === task.id;
  const indent   = (task.indent_level ?? 0) * 18;
  const [pctWarning, setPctWarning] = useState(false);

  const cycleStatus = () => {
    const cur = STATUS_CYCLE.indexOf(task.status);
    const next = STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length];
    onPatchTask(task.id, { status: next, percent_complete: next === "done" ? 100 : task.percent_complete });
  };

  const today = new Date().toISOString().slice(0, 10);
  const isLate = task.planned_finish && task.planned_finish < today && task.status !== "done";

  const renderCell = (col: typeof COL_DEFS[number]) => {
    switch (col.key) {
      case "dependencies":
        const preds = dependencies?.filter(d => d.successor_task_id === task.id) || [];
        const succs = dependencies?.filter(d => d.predecessor_task_id === task.id) || [];
        return (
          <td key="dependencies" className="p-2 text-xs text-slate-500 font-mono">
            {preds.length > 0 || succs.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {preds.map(pred => {
                  const predTask = tasks.find(t => t.id === pred.predecessor_task_id);
                  return (
                    <span key={pred.id} className="text-red-600" title={`Predecessor: ${predTask?.title ?? 'Unknown'} (${pred.dependency_type}${pred.lag_days ? `+${pred.lag_days}d` : ''})`}>
                      ← {predTask?.title?.slice(0, 15) ?? '???'}{predTask?.title && predTask.title.length > 15 ? '...' : ''}
                    </span>
                  );
                })}
                {succs.map(succ => {
                  const succTask = tasks.find(t => t.id === succ.successor_task_id);
                  return (
                    <span key={succ.id} className="text-green-600" title={`Successor: ${succTask?.title ?? 'Unknown'} (${succ.dependency_type}${succ.lag_days ? `+${succ.lag_days}d` : ''})`}>
                      → {succTask?.title?.slice(0, 15) ?? '???'}{succTask?.title && succTask.title.length > 15 ? '...' : ''}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>
        );
      case "duration":
        return (
          <td key="duration" className="p-2 text-slate-500 font-mono text-xs">
            {task.is_milestone ? "◆ Milestone" : task.duration_days != null ? `${task.duration_days}d` : "—"}
          </td>
        );
      case "start":
        return (
          <td key="start" className="p-2">
            <input
              type="date"
              className="text-xs border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-md px-1.5 py-1 bg-transparent outline-none transition-colors w-full"
              value={task.planned_start ?? ""}
              onChange={e => onPatchTask(task.id, { planned_start: e.target.value || null })}
            />
          </td>
        );
      case "finish":
        return (
          <td key="finish" className={`p-2 ${isLate ? "bg-red-50/50" : ""}`}>
            <input
              type="date"
              className={`text-xs border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-md px-1.5 py-1 bg-transparent outline-none transition-colors w-full ${isLate ? "text-red-600 font-semibold" : ""}`}
              value={task.planned_finish ?? ""}
              onChange={e => onPatchTask(task.id, { planned_finish: e.target.value || null })}
            />
          </td>
        );
      case "status":
        return (
          <td key="status" className="p-2">
            <button
              onClick={cycleStatus}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors w-full text-left ${STATUS_PILL[task.status]}`}
              title="Click to cycle status"
            >
              {STATUS_LABELS[task.status]}
            </button>
          </td>
        );
      case "percent":
        return (
          <td key="percent" className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${task.percent_complete}%`, backgroundColor: STATUS_COLORS[task.status] }}
                />
              </div>
              <input
                type="number" min={0} max={100}
                className="w-11 text-xs text-center border border-transparent hover:border-slate-200 focus:border-amber-400 rounded px-1 py-0.5 outline-none bg-transparent transition-colors"
                value={task.percent_complete}
                onChange={e => {
                  const raw = Number(e.target.value);
                  const clamped = Math.min(100, Math.max(0, raw));
                  if (raw !== clamped) {
                    setPctWarning(true);
                    setTimeout(() => setPctWarning(false), 2500);
                  }
                  onPatchTask(task.id, {
                    percent_complete: clamped,
                    status: statusFromPercent(clamped, task.status),
                  });
                }}
              />
            </div>
            {pctWarning && (
              <p className="text-amber-600 text-[10px] mt-0.5">Clamped to 0–100</p>
            )}
          </td>
        );
      case "actual_start":
        return (
          <td key="actual_start" className="p-2">
            <input
              type="date"
              className="text-xs border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-md px-1.5 py-1 bg-transparent outline-none transition-colors w-full"
              value={task.actual_start ? task.actual_start.slice(0, 10) : ""}
              onChange={e => onPatchTask(task.id, { actual_start: e.target.value || null })}
            />
          </td>
        );
      case "actual_finish":
        return (
          <td key="actual_finish" className="p-2">
            <input
              type="date"
              className="text-xs border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-md px-1.5 py-1 bg-transparent outline-none transition-colors w-full"
              value={task.actual_finish ? task.actual_finish.slice(0, 10) : ""}
              onChange={e => onPatchTask(task.id, { actual_finish: e.target.value || null })}
            />
          </td>
        );
      case "variance": {
        if (!task.actual_finish || !task.planned_finish) return <td key="variance" className="p-2 text-xs text-slate-300">—</td>;
        const late = task.actual_finish.slice(0, 10) > task.planned_finish;
        return (
          <td key="variance" className="p-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${late ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
              {late ? "Late" : "On time"}
            </span>
          </td>
        );
      }
      case "priority":
        return (
          <td key="priority" className="p-2">
            <select
              className="text-xs border border-transparent hover:border-slate-200 rounded-md px-1.5 py-1 bg-transparent outline-none transition-colors w-full"
              value={task.priority}
              style={{ color: PRIORITY_COLORS[task.priority] }}
              onChange={e => onPatchTask(task.id, { priority: e.target.value as TaskPriority })}
            >
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </td>
        );
      case "delay":
        return (
          <td key="delay" className="p-2">
            <select
              className="text-xs border border-transparent hover:border-slate-200 rounded-md px-1.5 py-1 bg-transparent outline-none transition-colors w-full"
              value={task.delay_type ?? ""}
              onChange={e => onPatchTask(task.id, { delay_type: (e.target.value || null) as DelayType | null })}
            >
              <option value="">No delay</option>
              {DELAY_TYPES.map(d => <option key={d} value={d}>{DELAY_TYPE_LABELS[d]}</option>)}
            </select>
          </td>
        );
      case "notes":
        return (
          <td key="notes" className="p-2">
            {isEditing(task.id, "notes") ? (
              <textarea
                autoFocus rows={2}
                className="w-full border border-amber-400 rounded-md px-2 py-1 text-xs bg-amber-50 outline-none resize-none"
                value={getLV(task.id, "notes", task.notes ?? "")}
                onChange={e => setLV(task.id, "notes", e.target.value)}
                onBlur={() => commitEdit(task.id, "notes", task)}
                onKeyDown={e => handleKD(e, task.id, "notes", task)}
              />
            ) : (
              <span
                className="text-xs text-slate-400 cursor-text hover:text-slate-600 truncate block max-w-[160px]"
                onClick={() => startEdit(task.id, "notes", task.notes ?? "")}
                title={task.notes ?? "Click to add notes"}
              >
                {task.notes || <span className="italic text-slate-300">Add note…</span>}
              </span>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <tr
      className={`border-t border-slate-100 hover:bg-slate-50/80 transition-colors group/row ${
        task.status === "done" ? "opacity-60" : ""
      } ${isSaving ? "opacity-50" : ""} ${isLate ? "bg-red-50/20" : ""}`}
      style={phaseColor ? { borderLeft: `2px solid ${phaseColor}30` } : undefined}
    >
      {/* Row number — click to open detail */}
      <td className="p-2 text-center">
        <button
          onClick={() => onOpenDetail(task)}
          className="text-xs text-slate-300 hover:text-amber-500 font-mono transition-colors w-6 h-6 rounded hover:bg-amber-50 flex items-center justify-center mx-auto"
          title="Open task details"
        >
          {rowNum}
        </button>
      </td>

      {/* Task name */}
      <td className="p-2" style={{ paddingLeft: `${8 + indent}px` }}>
        <div className="flex items-center gap-1.5 min-w-0">
          {task.is_milestone && <span className="text-purple-500 text-xs flex-shrink-0">◆</span>}
          {isEditing(task.id, "title") ? (
            <input
              autoFocus
              className="flex-1 border border-amber-400 rounded-md px-2 py-1 text-sm bg-amber-50 outline-none min-w-0"
              value={getLV(task.id, "title", task.title)}
              onChange={e => setLV(task.id, "title", e.target.value)}
              onBlur={() => commitEdit(task.id, "title", task)}
              onKeyDown={e => handleKD(e, task.id, "title", task)}
            />
          ) : (
            <span
              className={`text-sm cursor-text truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"} ${task.delay_type ? "text-orange-800" : ""}`}
              onClick={() => startEdit(task.id, "title", task.title)}
              title={task.title}
            >
              {task.title}
            </span>
          )}
          {task.delay_type && (
            <span className="flex-shrink-0 text-orange-500 text-xs" title={DELAY_TYPE_LABELS[task.delay_type]}>⚠</span>
          )}
        </div>
      </td>

      {/* Active columns */}
      {activeCols.map(col => renderCell(col))}

      {/* Delete */}
      <td className="p-2 text-center">
        <button
          onClick={() => { if (confirm("Delete this task?")) onDeleteTask(task.id); }}
          className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-red-500 transition-all text-sm"
          title="Delete task"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

// ── Global quick-add row (bottom of table) ──
function QuickAddRow({ phases, onAdd, saving, colCount }: {
  phases: PlanPhase[];
  onAdd: (title: string, phaseId?: string | null) => Promise<void>;
  saving: boolean;
  colCount: number;
}) {
  const [title, setTitle] = useState("");
  const [phaseId, setPhaseId] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await onAdd(title.trim(), phaseId || null);
    setTitle("");
  };

  return (
    <tr className="border-t-2 border-slate-200 bg-slate-50/40">
      <td className="p-2 text-center text-slate-300 text-lg">+</td>
      <td className="p-2">
        <input
          className="w-full border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm bg-white placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition-colors"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Quick add task…  (Enter)"
        />
      </td>
      <td className="p-2" colSpan={Math.max(1, colCount - 1)}>
        <div className="flex items-center gap-2">
          {phases.length > 0 && (
            <select
              className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white max-w-[180px]"
              value={phaseId}
              onChange={e => setPhaseId(e.target.value)}
            >
              <option value="">No phase</option>
              {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button
            disabled={!title.trim() || saving}
            onClick={submit}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm disabled:opacity-40 hover:bg-amber-400 transition-colors"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </td>
      <td />
    </tr>
  );
}

// ── Task detail slide-over panel ──
function TaskDetailPanel({ task, phases, saving, onPatch, onDelete, onClose }: {
  task: PlanTask;
  phases: PlanPhase[];
  saving: boolean;
  onPatch: (patch: Partial<PlanTask>) => void | Promise<void>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setTitle(task.title); setNotes(task.notes ?? ""); setDirty(false); }, [task.id, task.title, task.notes]);

  const save = async () => {
    await onPatch({ title: title.trim() || task.title, notes: notes || null });
    setDirty(false);
  };

  const phase = phases.find(p => p.id === task.phase_id);
  const today = new Date().toISOString().slice(0, 10);
  const isLate = task.planned_finish && task.planned_finish < today && task.status !== "done";

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-40 bg-white shadow-2xl border-l border-slate-200 w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {phase?.color && (
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: phase.color }} />
            )}
            <span className="text-xs font-semibold text-slate-500 truncate">{phase?.name ?? "Unphased"}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { if (confirm("Delete this task?")) onDelete(); }}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Task Name</label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none resize-none transition-colors"
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true); }}
            />
          </div>

          {/* Status + % */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-amber-400 outline-none"
                value={task.status}
                onChange={e => onPatch({ status: e.target.value as TaskStatus })}
              >
                {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Progress</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100" step="5"
                  className="flex-1 accent-amber-500"
                  value={task.percent_complete}
                  onChange={e => onPatch({ percent_complete: Number(e.target.value), status: statusFromPercent(Number(e.target.value), task.status) })}
                />
                <span className="text-sm font-bold text-slate-700 w-10 text-right">{task.percent_complete}%</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Planned Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none" value={task.planned_start ?? ""} onChange={e => onPatch({ planned_start: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Finish {isLate && <span className="text-red-500 font-semibold">· Overdue</span>}</label>
                <input type="date" className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none ${isLate ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"}`} value={task.planned_finish ?? ""} onChange={e => onPatch({ planned_finish: e.target.value || null })} />
              </div>
            </div>
          </div>

          {/* Actual dates */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Actual Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Actual Start</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none" value={task.actual_start ? task.actual_start.slice(0, 10) : ""} onChange={e => onPatch({ actual_start: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Actual Finish</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none" value={task.actual_finish ? task.actual_finish.slice(0, 10) : ""} onChange={e => onPatch({ actual_finish: e.target.value || null })} />
              </div>
            </div>
          </div>

          {/* Priority + Delay */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Priority</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-amber-400 outline-none" value={task.priority} onChange={e => onPatch({ priority: e.target.value as TaskPriority })}>
                {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delay</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-amber-400 outline-none" value={task.delay_type ?? ""} onChange={e => onPatch({ delay_type: (e.target.value || null) as DelayType | null })}>
                <option value="">No delay</option>
                {DELAY_TYPES.map(d => <option key={d} value={d}>{DELAY_TYPE_LABELS[d]}</option>)}
              </select>
            </div>
          </div>

          {/* Milestone toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={task.is_milestone} onChange={e => onPatch({ is_milestone: e.target.checked })} className="w-4 h-4 accent-purple-500" />
            <span className="text-sm font-medium text-slate-700">
              <span className="text-purple-500 mr-1.5">◆</span>
              Mark as milestone
            </span>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none resize-y transition-colors"
              value={notes}
              onChange={e => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Constraints, assumptions, site conditions…"
            />
          </div>
        </div>

        {/* Footer */}
        {dirty && (
          <div className="border-t border-slate-200 px-5 py-3 flex gap-3 flex-shrink-0">
            <button onClick={() => { setTitle(task.title); setNotes(task.notes ?? ""); setDirty(false); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Discard
            </button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 disabled:opacity-40 transition-colors">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
