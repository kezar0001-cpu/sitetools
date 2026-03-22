"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  GitMerge,
} from "lucide-react";
import type { SitePlanTask, SitePlanTaskNode, UpdateTaskPayload } from "@/types/siteplan";
import { STATUS_LABELS, buildTaskTree, flattenTree } from "@/types/siteplan";
import {
  useUpdateTask,
  useUpdateProgress,
  useDeleteTask,
  useProgressLog,
  useSitePlanTasks,
} from "@/hooks/useSitePlanTasks";
import { useCompanyId } from "@/hooks/useSitePlan";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import {
  useConflictDetection,
  CONFLICT_FIELD_LABELS,
  TEXT_CONFLICT_FIELDS,
  saveFieldPref,
} from "@/hooks/useConflictDetection";
import type { ConflictField, ConflictEntry } from "@/hooks/useConflictDetection";
import { StatusBadge } from "./StatusBadge";
import { TaskEditorTabs } from "./TaskEditorTabs";
import type { TaskStatus } from "@/types/siteplan";

interface TaskEditPanelProps {
  task: SitePlanTask;
  onClose: () => void;
  hasChildren: boolean;
  onAddSubtask?: () => void;
}

const DEBOUNCE_MS = 600;

// ─── Utilities ───────────────────────────────────────────────

type DiffSegment = { text: string; type: "equal" | "insert" | "delete" };

/** LCS-based character-level diff between two strings. Capped at 500 chars each. */
function computeCharDiff(local: string, remote: string): DiffSegment[] {
  const MAX = 500;
  if (local.length > MAX || remote.length > MAX) {
    return [{ text: local, type: "delete" }, { text: remote, type: "insert" }];
  }

  const m = local.length, n = remote.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        local[i - 1] === remote[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw: DiffSegment[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
      raw.unshift({ text: local[i - 1], type: "equal" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ text: remote[j - 1], type: "insert" });
      j--;
    } else {
      raw.unshift({ text: local[i - 1], type: "delete" });
      i--;
    }
  }

  const merged: DiffSegment[] = [];
  for (const seg of raw) {
    if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatConflictValue(field: ConflictField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  switch (field) {
    case "status":
      return STATUS_LABELS[value as TaskStatus] ?? String(value);
    case "progress":
      return `${value}%`;
    case "start_date":
    case "end_date":
    case "actual_start":
    case "actual_end": {
      const d = new Date(value as string);
      return isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
    }
    default:
      return String(value);
  }
}

// ─── ConflictCard ────────────────────────────────────────────

interface ConflictCardProps {
  conflict: ConflictEntry;
  localValue: unknown;
  members: ReturnType<typeof useCompanyMembers>["data"];
  onKeepLocal: (remember: boolean) => void;
  onUseRemote: (remember: boolean) => void;
  onApplyMerge: (mergeText: string, remember: boolean) => void;
}

function ConflictCard({
  conflict,
  localValue,
  members,
  onKeepLocal,
  onUseRemote,
  onApplyMerge,
}: ConflictCardProps) {
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeText, setMergeText] = useState(String(localValue ?? ""));
  const [remember, setRemember] = useState(false);

  const isTextField = TEXT_CONFLICT_FIELDS.has(conflict.field);
  const label = CONFLICT_FIELD_LABELS[conflict.field];

  const changedByMember = members?.find((m) => m.id === conflict.changedBy);
  const changedByName = changedByMember?.name ?? "Another user";

  const diffSegments = useMemo(() => {
    if (!isTextField || !mergeOpen) return null;
    return computeCharDiff(
      String(localValue ?? ""),
      String(conflict.remoteValue ?? "")
    );
  }, [isTextField, mergeOpen, localValue, conflict.remoteValue]);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
      <div>
        <span className="text-xs font-semibold text-amber-800">
          {label} conflict
        </span>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <User className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700">{changedByName}</span>
          <span className="text-[11px] text-amber-500">·</span>
          <Clock className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700">
            {relativeTime(conflict.changedAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Your version
          </span>
          <div className="text-xs text-slate-700 bg-white border border-blue-200 rounded p-2 min-h-[32px] break-words whitespace-pre-wrap">
            {formatConflictValue(conflict.field, localValue)}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Their version
          </span>
          <div className="text-xs text-slate-700 bg-white border border-amber-200 rounded p-2 min-h-[32px] break-words whitespace-pre-wrap">
            {formatConflictValue(conflict.field, conflict.remoteValue)}
          </div>
        </div>
      </div>

      {mergeOpen && isTextField && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Character diff
          </div>
          <div className="text-xs font-mono leading-relaxed bg-white border border-slate-200 rounded p-2 break-all">
            {diffSegments?.map((seg, idx) => (
              <span
                key={idx}
                className={
                  seg.type === "equal"
                    ? "text-slate-700"
                    : seg.type === "insert"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-700 line-through"
                }
              >
                {seg.text}
              </span>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Edit result
            </div>
            <textarea
              value={mergeText}
              onChange={(e) => setMergeText(e.target.value)}
              rows={3}
              className="w-full text-xs border border-slate-200 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onKeepLocal(remember)}
            className="px-2 py-1 text-[10px] font-medium bg-white border border-blue-300 rounded hover:bg-blue-50 text-blue-700"
          >
            Keep Local
          </button>

          {isTextField && (
            <button
              onClick={() => {
                setMergeText(String(localValue ?? ""));
                setMergeOpen((v) => !v);
              }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border rounded ${
                mergeOpen
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <GitMerge className="h-3 w-3" />
              Merge
            </button>
          )}

          <button
            onClick={() => onUseRemote(remember)}
            className="px-2 py-1 text-[10px] font-medium bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Use Remote
          </button>

          {mergeOpen && isTextField && (
            <button
              onClick={() => onApplyMerge(mergeText, remember)}
              className="px-2 py-1 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Merge
            </button>
          )}
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-3 h-3 rounded border-slate-300 accent-blue-600"
          />
          <span className="text-[10px] text-slate-500">
            Remember my choice for {label}
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── TaskEditPanel ───────────────────────────────────────────

export function TaskEditPanel({
  task,
  onClose,
  hasChildren,
  onAddSubtask,
}: TaskEditPanelProps) {
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

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
  const { data: logs } = useProgressLog(task.id);
  const { data: allTasks } = useSitePlanTasks(task.project_id);
  const { data: companyId } = useCompanyId();
  const { data: members } = useCompanyMembers(companyId ?? null);

  const isSaving = updateTask.isPending || updateProgress.isPending;

  // Refs for debounce callbacks and latest values
  const taskRef = useRef(task);
  taskRef.current = task;
  const formRef = useRef(form);
  formRef.current = form;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Debounced save ──────────────────────────────────────────

  const saveField = useCallback(
    (fieldName: string, value: unknown) => {
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      debounceTimers.current[fieldName] = setTimeout(() => {
        delete debounceTimers.current[fieldName];

        if (fieldName === "progress") {
          const t = taskRef.current;
          const newProgress = value as number;
          if (newProgress !== t.progress) {
            updateProgress.mutate(
              {
                taskId: t.id,
                projectId: t.project_id,
                progressBefore: t.progress,
                progressAfter: newProgress,
              },
              {
                onSuccess: () => {
                  setSavedField(fieldName);
                  setShowSaved(true);
                  setTimeout(() => setShowSaved(false), 1500);
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
      }, DEBOUNCE_MS);
    },
    [updateTask, updateProgress]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ─── Conflict detection ──────────────────────────────────────

  const { conflicts, handleKeepLocal, handleUseRemote, handleApplyMerge } =
    useConflictDetection(task, {
      debounceTimers,
      setForm,
      saveField,
      updateTask,
      formRef,
    });

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
    saveField(key, val);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:static md:inset-auto md:w-96 md:border-l md:border-slate-200 bg-white md:h-full flex flex-col max-h-[85vh] md:max-h-full rounded-t-2xl md:rounded-none shadow-xl md:shadow-none">
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

        {/* Conflict resolution */}
        {conflicts.length > 0 && (
          <div className="mx-4 mt-3 space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              {conflicts.length === 1
                ? "1 field edited remotely while you were typing"
                : `${conflicts.length} fields edited remotely while you were typing`}
            </div>
            {conflicts.map((conflict) => (
              <ConflictCard
                key={conflict.field}
                conflict={conflict}
                localValue={form[conflict.field as keyof UpdateTaskPayload]}
                members={members}
                onKeepLocal={(remember) =>
                  handleKeepLocal(conflict.field, remember)
                }
                onUseRemote={(remember) =>
                  handleUseRemote(conflict.field, conflict.remoteValue, remember)
                }
                onApplyMerge={(mergeText, remember) =>
                  handleApplyMerge(conflict.field, mergeText, remember)
                }
              />
            ))}
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
            onAddSubtask={onAddSubtask}
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
  );
}
