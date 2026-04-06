"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import {
  X,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { SitePlanTask, SitePlanTaskNode, UpdateTaskPayload } from "@/types/siteplan";
import { buildTaskTree, flattenTree } from "@/types/siteplan";
import {
  useUpdateTask,
  useUpdateProgress,
  useDeleteTask,
  useSitePlanTasks,
} from "@/hooks/useSitePlanTasks";
import { useCompanyId } from "@/hooks/useSitePlan";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { useConflictDetection, CONFLICT_FIELD_LABELS } from "@/hooks/useConflictDetection";
import { StatusBadge } from "./StatusBadge";

interface TaskEditPanelProps {
  task: SitePlanTask;
  onClose: () => void;
  hasChildren: boolean;
  onAddSubtask?: () => void;
  onLogDelay?: () => void;
  className?: string;
}

const DEBOUNCE_MS = 600;

// ─── TaskEditPanel ───────────────────────────────────────────

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
  const [, setSavedField] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
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

  // ─── Conflict detection ──────────────────────────────────────

  const { conflicts } = useConflictDetection(task, {
    debounceTimers,
    setForm,
    saveField,
    updateTask,
    formRef,
  });

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
      {
        onSuccess: () => onClose(),
        onError: () => toast.error("Failed to save. Please try again."),
      }
    );
  };

  return (
    <ComponentErrorBoundary>
      <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl md:absolute md:right-0 md:top-0 md:h-full md:max-h-full md:w-96 md:rounded-none md:border-l md:border-slate-200 md:pb-0 md:shadow-none ${className ?? ""}`}
      >
        <div className="mx-auto mb-3 mt-2 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
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
            <div className="w-full px-4 py-2.5 bg-amber-400 text-amber-900 text-xs font-medium">
              {conflictBannerText}
            </div>
          </div>
        )}

        {/* Tabbed editor */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* TODO: replaced */}
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
