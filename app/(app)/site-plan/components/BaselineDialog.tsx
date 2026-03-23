"use client";

import { useState } from "react";
import { X, Bookmark, Trash2, GitCompare, RotateCcw, ArrowLeft, Plus, Minus, CalendarDays, TrendingUp } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { SitePlanTask } from "@/types/siteplan";
import {
  useSitePlanBaselines,
  useSaveBaseline,
  useDeleteBaseline,
  useRestoreBaseline,
  computeBaselineDiff,
  type Baseline,
  type RestoreMode,
} from "@/hooks/useSitePlanBaselines";

interface BaselineDialogProps {
  projectId: string;
  tasks: SitePlanTask[];
  onClose: () => void;
}

type View = "list" | "compare" | "confirm-restore";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function BaselineDialog({
  projectId,
  tasks,
  onClose,
}: BaselineDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);
  const { data: baselines } = useSitePlanBaselines(projectId);
  const saveBaseline = useSaveBaseline();
  const deleteBaseline = useDeleteBaseline();
  const restoreBaseline = useRestoreBaseline();

  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Baseline | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("full");
  const [name, setName] = useState(
    `Baseline ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
  );

  const handleSave = () => {
    if (!name.trim() || tasks.length === 0) return;
    saveBaseline.mutate(
      { projectId, name: name.trim(), tasks },
      { onSuccess: () => setName("") }
    );
  };

  const openCompare = (b: Baseline) => {
    setSelected(b);
    setView("compare");
  };

  const openRestoreConfirm = (b: Baseline) => {
    setSelected(b);
    setRestoreMode("full");
    setView("confirm-restore");
  };

  const handleRestore = () => {
    if (!selected) return;
    restoreBaseline.mutate(
      {
        projectId,
        snapshot: selected.snapshot as unknown as SitePlanTask[],
        currentTasks: tasks,
        mode: restoreMode,
      },
      {
        onSuccess: () => {
          setView("list");
          setSelected(null);
          onClose();
        },
      }
    );
  };

  const goBack = () => {
    setView("list");
    setSelected(null);
  };

  // ── Diff view ────────────────────────────────────────────────────────────
  if (view === "compare" && selected) {
    const snapshot = selected.snapshot as unknown as SitePlanTask[];
    const diff = computeBaselineDiff(snapshot, tasks);
    const hasChanges =
      diff.added.length + diff.deleted.length + diff.dateChanges.length + diff.progressChanges.length > 0;

    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="baseline-dialog-title"
          tabIndex={-1}
          className="fixed inset-x-4 top-[8%] z-50 max-w-lg mx-auto bg-white rounded-xl shadow-xl focus:outline-none flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={goBack} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <GitCompare className="h-4 w-4 text-slate-500" />
              <span id="baseline-dialog-title" className="text-sm font-semibold text-slate-900">
                Compare with Current
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Baseline info */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
            <p className="text-xs font-medium text-slate-700">{selected.name}</p>
            <p className="text-xs text-slate-400">Created {fmtDateTime(selected.created_at)}</p>
          </div>

          {/* Summary pills */}
          <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-slate-100 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <Plus className="h-3 w-3" />
              {diff.added.length} added
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <Minus className="h-3 w-3" />
              {diff.deleted.length} deleted
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              <CalendarDays className="h-3 w-3" />
              {diff.dateChanges.length} date changes
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              <TrendingUp className="h-3 w-3" />
              {diff.progressChanges.length} progress changes
            </span>
          </div>

          {/* Diff body */}
          <div className="overflow-y-auto flex-1">
            {!hasChanges ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                No differences — current schedule matches this baseline
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {diff.added.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-green-700 mb-2">Added tasks</p>
                    <ul className="space-y-1">
                      {diff.added.map((t) => (
                        <li key={t.id} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          <span className="text-slate-700">{t.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diff.deleted.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-red-700 mb-2">Deleted tasks</p>
                    <ul className="space-y-1">
                      {diff.deleted.map((t) => (
                        <li key={t.id} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                          <span className="text-slate-500 line-through">{t.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diff.dateChanges.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">Date changes</p>
                    <ul className="space-y-2">
                      {diff.dateChanges.map(({ task, oldStart, oldEnd }) => (
                        <li key={task.id} className="text-xs">
                          <p className="text-slate-700 font-medium truncate">{task.name}</p>
                          <p className="text-slate-400">
                            <span className="line-through">{fmtDate(oldStart!)} → {fmtDate(oldEnd!)}</span>
                            <span className="ml-1 text-slate-600">→ {fmtDate(task.start_date)} → {fmtDate(task.end_date)}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diff.progressChanges.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Progress changes</p>
                    <ul className="space-y-1">
                      {diff.progressChanges.map(({ task, oldProgress }) => (
                        <li key={task.id} className="flex items-center justify-between text-xs gap-4">
                          <span className="text-slate-700 truncate">{task.name}</span>
                          <span className="shrink-0 text-slate-500">
                            {oldProgress}% → <span className="font-medium text-slate-700">{task.progress}%</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex justify-end">
            <button
              onClick={() => openRestoreConfirm(selected)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore to this baseline…
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Restore confirmation view ─────────────────────────────────────────────
  if (view === "confirm-restore" && selected) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="baseline-dialog-title"
          tabIndex={-1}
          className="fixed inset-x-4 top-[20%] z-50 max-w-md mx-auto bg-white rounded-xl shadow-xl focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button onClick={goBack} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <RotateCcw className="h-4 w-4 text-slate-500" />
              <span id="baseline-dialog-title" className="text-sm font-semibold text-slate-900">
                Restore to Baseline
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Baseline info */}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-sm font-medium text-slate-800">{selected.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Created {fmtDateTime(selected.created_at)}</p>
            </div>

            {/* Backup notice */}
            <p className="text-xs text-slate-500">
              Your current schedule will be saved as a backup baseline before restoring.
            </p>

            {/* Mode selection */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-slate-700 mb-1">Restore options</legend>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="restore-mode"
                  value="full"
                  checked={restoreMode === "full"}
                  onChange={() => setRestoreMode("full")}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm text-slate-800">Full restore</p>
                  <p className="text-xs text-slate-400">Restores dates and progress from the baseline snapshot</p>
                </div>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="restore-mode"
                  value="dates_only"
                  checked={restoreMode === "dates_only"}
                  onChange={() => setRestoreMode("dates_only")}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm text-slate-800">Revert dates only</p>
                  <p className="text-xs text-slate-400">Restores scheduled dates but keeps current progress</p>
                </div>
              </label>
            </fieldset>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              onClick={goBack}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleRestore}
              disabled={restoreBaseline.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {restoreBaseline.isPending ? "Restoring…" : "Restore"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── List view (default) ───────────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baseline-dialog-title"
        tabIndex={-1}
        className="fixed inset-x-4 top-[15%] z-50 max-w-md mx-auto bg-white rounded-xl shadow-xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-slate-500" />
            <span id="baseline-dialog-title" className="text-sm font-semibold text-slate-900">
              Baselines
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Save new baseline */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-500 mb-2">
            Save a snapshot of the current schedule to compare progress later.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Baseline name"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px]"
            />
            <button
              onClick={handleSave}
              disabled={saveBaseline.isPending || !name.trim() || tasks.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[40px] shrink-0"
            >
              {saveBaseline.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Existing baselines */}
        <div className="max-h-72 overflow-y-auto">
          {!baselines || baselines.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              No baselines saved yet
            </div>
          ) : (
            baselines.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 px-4 py-3 border-b border-slate-50 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{b.name}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDateTime(b.created_at)} · {(b.snapshot as unknown as SitePlanTask[]).length} tasks
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openCompare(b)}
                    title="Compare with current"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openRestoreConfirm(b)}
                    title="Restore to this baseline"
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteBaseline.mutate({ id: b.id, projectId })}
                    title="Delete baseline"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
