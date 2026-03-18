"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Trash2, Check, Loader2, AlertTriangle } from "lucide-react";
import type { SitePlanTask, SitePlanTaskNode, TaskStatus, UpdateTaskPayload } from "@/types/siteplan";
import { STATUS_LABELS, buildTaskTree, flattenTree } from "@/types/siteplan";
import {
  useUpdateTask,
  useUpdateProgress,
  useDeleteTask,
  useProgressLog,
  useSitePlanTasks,
} from "@/hooks/useSitePlanTasks";
import { useCompanyId } from "@/hooks/useSitePlan";
import { useCompanyMembers, type CompanyMember } from "@/hooks/useCompanyMembers";
import { StatusBadge } from "./StatusBadge";
import { ProgressSlider } from "./ProgressSlider";

interface TaskEditPanelProps {
  task: SitePlanTask;
  onClose: () => void;
  hasChildren: boolean;
  onAddSubtask?: () => void;
}

const DEBOUNCE_MS = 600;

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

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
  const { data: logs } = useProgressLog(task.id);
  const { data: allTasks } = useSitePlanTasks(task.project_id);
  const { data: companyId } = useCompanyId();
  const { data: members } = useCompanyMembers(companyId ?? null);

  const isSaving = updateTask.isPending || updateProgress.isPending;
  const [showSaved, setShowSaved] = useState(false);

  // Refs to track latest values for debounce callbacks
  const taskRef = useRef(task);
  taskRef.current = task;
  const formRef = useRef(form);
  formRef.current = form;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Track the PREVIOUS task's identity so pending saves flush to the correct row
  const prevTaskIdRef = useRef<string>(task.id);
  const prevTaskProjectIdRef = useRef<string>(task.project_id);

  // Unified save function — all fields go through this with debounce
  const saveField = useCallback(
    (fieldName: string, value: unknown) => {
      // Clear existing timer for this field
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      debounceTimers.current[fieldName] = setTimeout(() => {
        delete debounceTimers.current[fieldName];

        // Special handling for progress — log it
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

        // Regular field save
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

  // Cleanup any remaining timers on final unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // When task.id changes: flush pending saves to the PREVIOUS task, then reset form
  useEffect(() => {
    const pendingKeys = Object.keys(debounceTimers.current);

    if (pendingKeys.length > 0) {
      const updates: UpdateTaskPayload = {};
      for (const key of pendingKeys) {
        clearTimeout(debounceTimers.current[key]);
        (updates as Record<string, unknown>)[key] =
          formRef.current[key as keyof UpdateTaskPayload];
      }
      debounceTimers.current = {};

      updateTask.mutate({
        id: prevTaskIdRef.current,
        projectId: prevTaskProjectIdRef.current,
        updates,
      });
    } else {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
    }

    prevTaskIdRef.current = task.id;
    prevTaskProjectIdRef.current = task.project_id;

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

  // Count all descendants for cascade delete warning
  const descendantCount = useMemo(() => {
    if (!hasChildren || !allTasks) return 0;
    const tree = buildTaskTree(allTasks);
    const flat = flattenTree(tree);
    const taskNode = flat.find((n) => n.id === task.id);
    if (!taskNode || taskNode.children.length === 0) return 0;
    // Count all descendants
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

  // Unified change handler — updates local state and debounces save
  const handleChange = <K extends keyof UpdateTaskPayload>(
    key: K,
    val: UpdateTaskPayload[K]
  ) => {
    setForm((f) => ({ ...f, [key]: val }));
    saveField(key, val);
  };

  // CSS class for field that just saved (green border flash)
  const savedFieldClass = (fieldName: string) =>
    savedField === fieldName
      ? "ring-2 ring-green-400 transition-all duration-300"
      : "transition-all duration-300";

  // Close any open combobox when task changes
  const comboboxKeyRef = useRef(task.id);
  comboboxKeyRef.current = task.id;

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Task Name
            </label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`w-full text-lg font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${savedFieldClass("name")}`}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              value={form.status ?? task.status}
              onChange={(e) =>
                handleChange("status", e.target.value as TaskStatus)
              }
              className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedFieldClass("status")}`}
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Progress
            </label>
            <ProgressSlider
              value={form.progress ?? task.progress}
              onChange={(v) => handleChange("progress", v)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Planned Start
              </label>
              <input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedFieldClass("start_date")}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Planned End
              </label>
              <input
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => handleChange("end_date", e.target.value)}
                className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedFieldClass("end_date")}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Actual Start
              </label>
              <input
                type="date"
                value={form.actual_start ?? ""}
                onChange={(e) =>
                  handleChange("actual_start", e.target.value || null)
                }
                className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedFieldClass("actual_start")}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Actual End
              </label>
              <input
                type="date"
                value={form.actual_end ?? ""}
                onChange={(e) =>
                  handleChange("actual_end", e.target.value || null)
                }
                className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedFieldClass("actual_end")}`}
              />
            </div>
          </div>

          {/* Predecessors */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Predecessors
            </label>
            <input
              type="text"
              value={form.predecessors ?? ""}
              onChange={(e) => handleChange("predecessors", e.target.value || null)}
              placeholder="e.g. 1, 3FS+2d"
              className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedFieldClass("predecessors")}`}
            />
          </div>

          {/* Assigned To — autocomplete from company members */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Assigned To
            </label>
            <MemberCombobox
              value={form.assigned_to ?? ""}
              onChange={(val) => handleChange("assigned_to", val || null)}
              members={members ?? []}
              placeholder="Person or team"
              className={savedFieldClass("assigned_to")}
            />
          </div>

          {/* Responsible — autocomplete from company members */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Responsible
            </label>
            <MemberCombobox
              value={form.responsible ?? ""}
              onChange={(val) => handleChange("responsible", val || null)}
              members={members ?? []}
              placeholder="Name or trade"
              className={savedFieldClass("responsible")}
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Comments
            </label>
            <textarea
              value={form.comments ?? ""}
              onChange={(e) =>
                handleChange("comments", e.target.value || null)
              }
              rows={2}
              placeholder="Add comments..."
              className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedFieldClass("comments")}`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) =>
                handleChange("notes", e.target.value || null)
              }
              rows={3}
              className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedFieldClass("notes")}`}
            />
          </div>

          {/* Add subtask */}
          {task.type !== "subtask" && onAddSubtask && (
            <button
              onClick={onAddSubtask}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
            >
              + Add Subtask
            </button>
          )}

          {/* Progress log */}
          {logs && logs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                Progress History
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="text-xs text-slate-500 flex items-center gap-2"
                  >
                    <span>
                      {log.progress_before}% → {log.progress_after}%
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      {new Date(log.logged_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {log.note && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{log.note}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          <div className="pt-2 border-t border-slate-100">
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
                      task{descendantCount !== 1 ? "s" : ""}. This cannot be undone.
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
      </div>
    </>
  );
}

// ─── MemberCombobox ─────────────────────────────────────────

function MemberCombobox({
  value,
  onChange,
  members,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  members: CompanyMember[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = useMemo(
    () =>
      members.filter((m) =>
        m.name.toLowerCase().includes(inputValue.toLowerCase())
      ),
    [members, inputValue]
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay to allow click on dropdown
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${className}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setInputValue(m.name);
                onChange(m.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{m.name}</span>
              {m.email && (
                <span className="text-xs text-slate-400 truncate ml-auto">
                  {m.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
