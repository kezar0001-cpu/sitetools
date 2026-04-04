"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import {
  X,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import type { SitePlanTask, SitePlanTaskNode, UpdateTaskPayload } from "@/types/siteplan";
import { buildTaskTree, flattenTree } from "@/types/siteplan";
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
import { ConflictResolutionPanel } from "./ConflictResolutionPanel";
import { StatusBadge } from "./StatusBadge";
import { TaskEditorTabs } from "./TaskEditorTabs";

interface TaskEditPanelProps {
  task: SitePlanTask;
  onClose: () => void;
  hasChildren: boolean;
  onAddSubtask?: () => void;
  className?: string;
}

const DEBOUNCE_MS = 600;

// ─── TaskEditPanel ───────────────────────────────────────────

export function TaskEditPanel({
  task,
  onClose,
  hasChildren,
  onAddSubtask,
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
  const [conflictPanelOpen, setConflictPanelOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
  const { data: logs } = useProgressLog(task.id);
  const { data: delayLogs } = useDelayLogs(task.id);
  const { data: allTasks } = useSitePlanTasks(task.project_id);
  const { data: companyId } = useCompanyId();
  const { data: members } = useCompanyMembers(companyId ?? null);

  const isSaving = updateTask.isPending || updateProgress.isPending;

  // Refs for latest values (needed inside debounced callbacks)
  const taskRef = useRef(task);
  taskRef.current = task;
  const formRef = useRef(form);
  formRef.current = form;

  const { schedule, timersRef: debounceTimers } = useDebounceAsync(DEBOUNCE_MS);

  // ─── Debounced save ──────────────────────────────────────────

  const saveField = useCallback(
    (fieldName: string, value: unknown) => {
      schedule(fieldName, () => {
        if (fieldName === "progress") {
          const t = taskRef.current;
          const newProgress = value as number;
          if (newProgress !== t.progress) {
            const note = progressNoteRef.current.trim() || undefined;
            updateProgress.mutate(
              {
                taskId: t.id,
                projectId: t.project_id,
                progressBefore: t.progress,
                progressAfter: newProgress,
                note,
              },
              {
                onSuccess: () => {
                  setSavedField(fieldName);
                  setShowSaved(true);
                  setTimeout(() => setShowSaved(false), 1500);
                  setProgressNote("");
                },
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
          }
        );
      });
    },
    [schedule, updateTask, updateProgress]
  );

  // ─── Conflict detection ──────────────────────────────────────

  const { conflicts, handleKeepLocal, handleUseRemote, handleApplyMerge } =
    useConflictDetection(task, {
      debounceTimers,
      setForm,
      saveField,
      updateTask,
      formRef,
    });

  // Close conflict panel automatically once all conflicts are resolved
  useEffect(() => {
    if (conflicts.length === 0) setConflictPanelOpen(false);
  }, [conflicts.length]);

  // Summarise the pending conflicts for the banner label
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

  // ─── Reset UI on task switch ─────────────────────────────────

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // ─── Cascade delete warning ──────────────────────────────────

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
      { onSuccess: () => onClose() }
    );
  };

  // ─── Unified change handler ──────────────────────────────────

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

  return (
    <ComponentErrorBoundary>
      <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 z-40 xl:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 xl:static xl:inset-auto xl:w-96 xl:border-l xl:border-slate-200 bg-white xl:h-full flex flex-col max-h-[85vh] xl:max-h-full rounded-t-2xl xl:rounded-none shadow-xl xl:shadow-none ${className ?? ""}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
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

        {/* Conflict banner — non-blocking; panel slides down on demand */}
        {conflicts.length > 0 && (
          <div className="shrink-0">
            <button
              onClick={() => setConflictPanelOpen((v) => !v)}
              className="w-full px-4 py-2.5 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-900 text-xs font-medium text-left flex items-center justify-between gap-2"
            >
              <span>{conflictBannerText} — Tap to resolve</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  conflictPanelOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {conflictPanelOpen && (
              <div className="border-b border-amber-200 animate-in slide-in-from-top-1 duration-200">
                <ConflictResolutionPanel
                  conflicts={conflicts}
                  form={form}
                  members={members}
                  onKeepLocal={handleKeepLocal}
                  onUseRemote={handleUseRemote}
                  onApplyMerge={handleApplyMerge}
                />
              </div>
            )}
          </div>
        )}

        {/* Tabbed editor */}
        <div className="flex-1 min-h-0 flex flex-col">
          <TaskEditorTabs
            task={task}
            form={form}
            onChange={handleChange}
            savedField={savedField}
            members={members ?? []}
            logs={logs ?? []}
            delayLogs={delayLogs ?? []}
            progressNote={progressNote}
            onProgressNoteChange={setProgressNote}
            onAddSubtask={onAddSubtask}
            dateError={dateError}
          />
        </div>

        {/* Delete footer */}
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
