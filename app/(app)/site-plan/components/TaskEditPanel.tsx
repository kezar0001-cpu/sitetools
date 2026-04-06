"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { X, Trash2, Check, Loader2, AlertTriangle } from "lucide-react";
import type { SitePlanTask, SitePlanTaskNode, UpdateTaskPayload, TaskStatus } from "@/types/siteplan";
import { buildTaskTree, flattenTree, STATUS_LABELS } from "@/types/siteplan";
import {
  useUpdateTask,
  useUpdateProgress,
  useDeleteTask,
  useProgressLog,
  useSitePlanTasks,
} from "@/hooks/useSitePlanTasks";
import { useDelayLogs } from "@/hooks/useSitePlanDelays";
import { useCompanyId } from "@/hooks/useSitePlan";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useConflictDetection, CONFLICT_FIELD_LABELS } from "@/hooks/useConflictDetection";
import { StatusBadge } from "./StatusBadge";
import { ProgressSlider } from "./ProgressSlider";

interface TaskEditPanelProps {
  task: SitePlanTask;
  onClose: () => void;
  hasChildren: boolean;
  onAddSubtask?: () => void;
  onLogDelay?: () => void;
  className?: string;
}

const DEBOUNCE_MS = 600;

export function TaskEditPanel({
  task,
  onClose,
  hasChildren,
  className,
}: TaskEditPanelProps) {
  const [progressNote, setProgressNote] = useState("");
  const progressNoteRef = useRef("");
  progressNoteRef.current = progressNote;

  const [form, setForm] = useState<UpdateTaskPayload>({
    name: task.name,
    status: task.status,
    progress: task.progress,
    start_date: task.start_date,
    end_date: task.end_date,
    actual_start: task.actual_start,
    actual_end: task.actual_end,
    predecessors: task.predecessors,
    responsible: task.responsible,
    assigned_to: task.assigned_to,
    comments: task.comments,
    notes: task.notes,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
  const { data: logs } = useProgressLog(task.id);
  const { data: delayLogs } = useDelayLogs(task.id);
  const { data: allTasks } = useSitePlanTasks(task.project_id);
  const { data: companyId } = useCompanyId();
  const { data: members } = useCompanyMembers(companyId ?? null);

  const isSaving = updateTask.isPending || updateProgress.isPending;

  const taskRef = useRef(task);
  taskRef.current = task;
  const formRef = useRef(form);
  formRef.current = form;

  const { schedule, timersRef: debounceTimers } = useDebounceAsync(DEBOUNCE_MS);

  const saveField = useCallback(
    (fieldName: string, value: unknown) => {
      schedule(fieldName, () => {
        if (fieldName === "progress") {
          const t = taskRef.current;
          const newProgress = value as number;
          if (newProgress !== t.progress) {
            const note = progressNoteRef.current.trim() || undefined;
            let statusAfter: UpdateTaskPayload["status"] | undefined;
            if (newProgress === 100 && t.status !== "completed") {
              statusAfter = "completed";
            } else if (
              t.progress === 0 &&
              newProgress > 0 &&
              t.status === "not_started"
            ) {
              statusAfter = "in_progress";
            }
            updateProgress.mutate(
              {
                taskId: t.id,
                projectId: t.project_id,
                progressBefore: t.progress,
                progressAfter: newProgress,
                statusAfter,
                note,
              },
              {
                onSuccess: () => {
                  setSavedField(fieldName);
                  setShowSaved(true);
                  setTimeout(() => setShowSaved(false), 1500);
                  setProgressNote("");
                },
                onError: () => toast.error("Failed to save. Please try again."),
              }
            );
          }
          return;
        }

        updateTask.mutate(
          {
            id: taskRef.current.id,
            projectId: taskRef.current.project_id,
            updates: { [fieldName]: value },
          },
          {
            onSuccess: () => {
              setSavedField(fieldName);
              setShowSaved(true);
              setTimeout(() => setShowSaved(false), 1500);
            },
            onError: () => toast.error("Failed to save. Please try again."),
          }
        );
      });
    },
    [schedule, updateTask, updateProgress]
  );

  const { conflicts } = useConflictDetection(task, {
    debounceTimers,
    setForm,
    saveField,
    updateTask,
    formRef,
  });

  const conflictBannerText = useMemo(() => {
    if (conflicts.length === 0) return "";
    const latest = conflicts[conflicts.length - 1];
    const member = members?.find((m) => m.id === latest.changedBy);
    const name = member?.name ?? "Someone";
    if (conflicts.length === 1) {
      return `${name} updated ${CONFLICT_FIELD_LABELS[latest.field]} while you were editing`;
    }
    return `${name} updated ${conflicts.length} fields while you were editing`;
  }, [conflicts, members]);

  useEffect(() => {
    setForm({
      name: task.name,
      status: task.status,
      progress: task.progress,
      start_date: task.start_date,
      end_date: task.end_date,
      actual_start: task.actual_start,
      actual_end: task.actual_end,
      predecessors: task.predecessors,
      responsible: task.responsible,
      assigned_to: task.assigned_to,
      comments: task.comments,
      notes: task.notes,
    });
    setShowDeleteConfirm(false);
    setShowSaved(false);
    setSavedField(null);
    setProgressNote("");
    setDateError(null);
    setShowAllHistory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const descendantCount = useMemo(() => {
    if (!hasChildren || !allTasks) return 0;
    const tree = buildTaskTree(allTasks);
    const flat = flattenTree(tree);
    const taskNode = flat.find((n) => n.id === task.id);
    if (!taskNode || taskNode.children.length === 0) return 0;
    const count = (nodes: SitePlanTaskNode[]): number => {
      let c = 0;
      for (const n of nodes) {
        c += 1 + count(n.children);
      }
      return c;
    };
    return count(taskNode.children);
  }, [task.id, hasChildren, allTasks]);

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, projectId: task.project_id },
      {
        onSuccess: () => onClose(),
        onError: () => toast.error("Failed to save. Please try again."),
      }
    );
  };

  const handleChange = <K extends keyof UpdateTaskPayload>(
    key: K,
    val: UpdateTaskPayload[K]
  ) => {
    setForm((f) => ({ ...f, [key]: val }));

    if (key === "start_date" || key === "end_date") {
      const newStart = key === "start_date" ? (val as string) : form.start_date;
      const newEnd = key === "end_date" ? (val as string) : form.end_date;
      if (newStart && newEnd && newEnd < newStart) {
        setDateError("End date must be on or after start date.");
        return;
      }
      setDateError(null);
    }

    saveField(key, val);
  };

  const savedClass = (fieldName: string) =>
    savedField === fieldName
      ? "ring-2 ring-green-400 transition-all duration-300"
      : "transition-all duration-300";

  const durationLabel = useMemo(() => {
    const start = form.start_date;
    const end = form.end_date;
    if (!start || !end || end < start) return "—";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    return Number.isFinite(days) && days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "—";
  }, [form.end_date, form.start_date]);

  const historyLogs = logs ?? [];
  const visibleHistory = showAllHistory ? historyLogs : historyLogs.slice(0, 5);

  return (
    <ComponentErrorBoundary>
      <>
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />

        <div
          className={`fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl md:absolute md:right-0 md:top-0 md:h-full md:max-h-full md:w-96 md:rounded-none md:border-l md:border-slate-200 md:pb-0 md:shadow-none ${className ?? ""}`}
        >
          <div className="mx-auto mb-3 mt-2 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 uppercase">
                {task.type}
              </span>
              <StatusBadge status={task.status} />
              {isSaving && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {!isSaving && showSaved && (
                <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-200">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {conflicts.length > 0 && (
            <div className="shrink-0">
              <div className="w-full px-4 py-2.5 bg-amber-400 text-amber-900 text-xs font-medium">
                {conflictBannerText}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 bg-slate-50 px-4 py-2 sticky top-0 z-10">SCHEDULE</div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Task Name</label>
                <input
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass("name")}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select
                  value={(form.status ?? task.status) as TaskStatus}
                  onChange={(e) => handleChange("status", e.target.value as TaskStatus)}
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass("status")}`}
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={(form.start_date ?? "").slice(0, 10)}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass("start_date")}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={(form.end_date ?? "").slice(0, 10)}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass("end_date")}`}
                  />
                </div>
              </div>
              {dateError && <p className="text-xs text-red-600">{dateError}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                <div className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 min-h-[44px] flex items-center">
                  {durationLabel}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Progress</label>
                <ProgressSlider
                  value={form.progress ?? task.progress}
                  onChange={(v) => handleChange("progress", Number(v))}
                />
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 bg-slate-50 px-4 py-2 sticky top-0 z-10">TEAM</div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Assigned To</label>
                <input
                  type="text"
                  value={form.assigned_to ?? ""}
                  onChange={(e) => handleChange("assigned_to", e.target.value || null)}
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass("assigned_to")}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Responsible</label>
                <input
                  type="text"
                  value={form.responsible ?? ""}
                  onChange={(e) => handleChange("responsible", e.target.value || null)}
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass("responsible")}`}
                />
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 bg-slate-50 px-4 py-2 sticky top-0 z-10">NOTES</div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Comments</label>
                <textarea
                  value={form.comments ?? ""}
                  onChange={(e) => handleChange("comments", e.target.value || null)}
                  rows={3}
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedClass("comments")}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => handleChange("notes", e.target.value || null)}
                  rows={4}
                  className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedClass("notes")}`}
                />
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 bg-slate-50 px-4 py-2 sticky top-0 z-10">HISTORY</div>
            <div className="px-4 py-4 space-y-3">
              {historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No progress updates yet.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {visibleHistory.map((log) => (
                      <div key={log.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                        <div className="text-xs font-medium text-slate-700">
                          {log.progress_before}% → {log.progress_after}%
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(log.logged_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        {log.note && <p className="text-xs text-slate-600 mt-1">{log.note}</p>}
                      </div>
                    ))}
                  </div>
                  {historyLogs.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllHistory((v) => !v)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      {showAllHistory ? "Show less" : "Show all"}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 bg-slate-50 px-4 py-2 sticky top-0 z-10">DELAYS</div>
            <div className="px-4 py-4 space-y-2">
              {(delayLogs ?? []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No delays logged.</p>
              ) : (
                (delayLogs ?? []).map((dl) => (
                  <div
                    key={dl.id}
                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {dl.delay_category}
                      </span>
                      <span className="font-medium text-red-800">+{dl.delay_days}d</span>
                      <span className="text-slate-400 ml-auto">
                        {new Date(dl.logged_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-slate-600">{dl.delay_reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 py-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
            ) : (
              <div className="space-y-2">
                {hasChildren && descendantCount > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      Deleting this {task.type} will permanently delete{" "}
                      <span className="font-bold">{descendantCount}</span> child
                      task{descendantCount !== 1 ? "s" : ""}. This cannot be
                      undone.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteTask.isPending}
                    className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg min-h-[44px] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {deleteTask.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {deleteTask.isPending ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-700 min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    </ComponentErrorBoundary>
  );
}
