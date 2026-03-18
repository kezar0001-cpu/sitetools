"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trash2, Check, Loader2 } from "lucide-react";
import type { SitePlanTask, TaskStatus, UpdateTaskPayload } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import {
  useUpdateTask,
  useUpdateProgress,
  useDeleteTask,
  useProgressLog,
} from "@/hooks/useSitePlanTasks";
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
  const { data: logs } = useProgressLog(task.id);

  // Refs to track latest values for debounce callbacks
  const taskRef = useRef(task);
  taskRef.current = task;
  const formRef = useRef(form);
  formRef.current = form;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Track the PREVIOUS task's identity so pending saves flush to the correct row
  const prevTaskIdRef = useRef<string>(task.id);
  const prevTaskProjectIdRef = useRef<string>(task.project_id);

  // Flash a saved indicator briefly
  const flashSaved = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  // Save a single field (or set of fields)
  const saveField = useCallback(
    (updates: UpdateTaskPayload) => {
      updateTask.mutate(
        { id: taskRef.current.id, projectId: taskRef.current.project_id, updates },
        { onSuccess: () => flashSaved() }
      );
    },
    [updateTask, flashSaved]
  );

  // Save progress with logging
  const saveProgress = useCallback(
    (value: number) => {
      const t = taskRef.current;
      if (value !== t.progress) {
        updateProgress.mutate(
          {
            taskId: t.id,
            projectId: t.project_id,
            progressBefore: t.progress,
            progressAfter: value,
          },
          { onSuccess: () => flashSaved() }
        );
      }
    },
    [updateProgress, flashSaved]
  );

  // Debounced save for text fields (name, notes, comments)
  const debouncedSave = useCallback(
    (key: keyof UpdateTaskPayload, value: string | null) => {
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        saveField({ [key]: value });
      }, DEBOUNCE_MS);
    },
    [saveField]
  );

  // Cleanup any remaining timers on final unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // When task.id changes: flush pending saves to the PREVIOUS task, then reset form
  useEffect(() => {
    const pendingKeys = Object.keys(
      debounceTimers.current
    ) as (keyof UpdateTaskPayload)[];

    if (pendingKeys.length > 0) {
      // Build an updates object from the current (stale) form values
      const updates: UpdateTaskPayload = {};
      for (const key of pendingKeys) {
        clearTimeout(debounceTimers.current[key]);
        (updates as Record<string, unknown>)[key as string] =
          formRef.current[key];
      }
      debounceTimers.current = {};

      // Save to the PREVIOUS task — prevTaskIdRef still holds its ID
      // because we update the ref AFTER this block
      updateTask.mutate({
        id: prevTaskIdRef.current,
        projectId: prevTaskProjectIdRef.current,
        updates,
      });
    } else {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
    }

    // Advance the previous-task refs to the newly selected task
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
    setConfirmDelete(false);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, projectId: task.project_id },
      { onSuccess: () => onClose() }
    );
  };

  // Local state setter
  const set = <K extends keyof UpdateTaskPayload>(
    key: K,
    val: UpdateTaskPayload[K]
  ) => setForm((f) => ({ ...f, [key]: val }));

  // Immediate save handler for selects / dates
  const setAndSave = <K extends keyof UpdateTaskPayload>(
    key: K,
    val: UpdateTaskPayload[K]
  ) => {
    set(key, val);
    saveField({ [key]: val });
  };

  // On-blur save for non-debounced text fields (predecessors, assigned_to, responsible)
  const handleBlurSave = (key: keyof UpdateTaskPayload) => {
    const current = formRef.current[key];
    const original = task[key as keyof SitePlanTask];
    if (current !== original) {
      saveField({ [key]: current });
    }
  };

  // Debounced text change handler (name, notes, comments)
  const handleDebouncedChange = (key: keyof UpdateTaskPayload, value: string | null) => {
    set(key, value);
    debouncedSave(key, value);
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase">
              {task.type}
            </span>
            <StatusBadge status={task.status} />
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-200">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {(updateTask.isPending || updateProgress.isPending) && (
              <span className="text-xs text-slate-400">Saving...</span>
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
          {/* Name — debounced */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Task Name
            </label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => handleDebouncedChange("name", e.target.value)}
              className="w-full text-lg font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status — immediate */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              value={form.status ?? task.status}
              onChange={(e) =>
                setAndSave("status", e.target.value as TaskStatus)
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Progress — immediate on commit */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Progress
            </label>
            <ProgressSlider
              value={form.progress ?? task.progress}
              onChange={(v) => {
                set("progress", v);
                saveProgress(v);
              }}
            />
          </div>

          {/* Dates — immediate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Planned Start
              </label>
              <input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => setAndSave("start_date", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Planned End
              </label>
              <input
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => setAndSave("end_date", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
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
                  setAndSave("actual_start", e.target.value || null)
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
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
                  setAndSave("actual_end", e.target.value || null)
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
          </div>

          {/* Predecessors — save on blur */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Predecessors
            </label>
            <input
              type="text"
              value={form.predecessors ?? ""}
              onChange={(e) => set("predecessors", e.target.value || null)}
              onBlur={() => handleBlurSave("predecessors")}
              placeholder="e.g. 1, 3FS+2d"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>

          {/* Assigned To — save on blur */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={form.assigned_to ?? ""}
              onChange={(e) => set("assigned_to", e.target.value || null)}
              onBlur={() => handleBlurSave("assigned_to")}
              placeholder="Person or team"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>

          {/* Responsible — save on blur */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Responsible
            </label>
            <input
              type="text"
              value={form.responsible ?? ""}
              onChange={(e) => set("responsible", e.target.value || null)}
              onBlur={() => handleBlurSave("responsible")}
              placeholder="Name or trade"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>

          {/* Comments — debounced */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Comments
            </label>
            <textarea
              value={form.comments ?? ""}
              onChange={(e) =>
                handleDebouncedChange("comments", e.target.value || null)
              }
              rows={2}
              placeholder="Add comments..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
            />
          </div>

          {/* Notes — debounced */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) =>
                handleDebouncedChange("notes", e.target.value || null)
              }
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
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
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 py-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
            ) : (
              <div className="space-y-2">
                {hasChildren && (
                  <p className="text-xs text-red-600">
                    This task has children. Deleting will remove all children
                    too.
                  </p>
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
                    onClick={() => setConfirmDelete(false)}
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
