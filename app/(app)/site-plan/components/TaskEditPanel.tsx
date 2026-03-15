"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
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
    responsible: task.responsible,
    notes: task.notes,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const deleteTask = useDeleteTask();
  const { data: logs } = useProgressLog(task.id);

  // Reset form when task changes
  useEffect(() => {
    setForm({
      name: task.name,
      status: task.status,
      progress: task.progress,
      start_date: task.start_date,
      end_date: task.end_date,
      actual_start: task.actual_start,
      actual_end: task.actual_end,
      responsible: task.responsible,
      notes: task.notes,
    });
    setConfirmDelete(false);
  }, [task.id, task.name, task.status, task.progress, task.start_date, task.end_date, task.actual_start, task.actual_end, task.responsible, task.notes]);

  const handleSave = () => {
    // If progress changed, log it
    if (form.progress !== undefined && form.progress !== task.progress) {
      updateProgress.mutate({
        taskId: task.id,
        projectId: task.project_id,
        progressBefore: task.progress,
        progressAfter: form.progress,
      });
    } else {
      updateTask.mutate({
        id: task.id,
        projectId: task.project_id,
        updates: form,
      });
    }
  };

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, projectId: task.project_id },
      { onSuccess: () => onClose() }
    );
  };

  const set = <K extends keyof UpdateTaskPayload>(
    key: K,
    val: UpdateTaskPayload[K]
  ) => setForm((f) => ({ ...f, [key]: val }));

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
              onChange={(e) => set("name", e.target.value)}
              className="w-full text-lg font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              value={form.status ?? task.status}
              onChange={(e) => set("status", e.target.value as TaskStatus)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
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
              onChange={(v) => set("progress", v)}
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
                onChange={(e) => set("start_date", e.target.value)}
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
                onChange={(e) => set("end_date", e.target.value)}
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
                  set("actual_start", e.target.value || null)
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
                  set("actual_end", e.target.value || null)
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
          </div>

          {/* Responsible */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Responsible
            </label>
            <input
              type="text"
              value={form.responsible ?? ""}
              onChange={(e) => set("responsible", e.target.value || null)}
              placeholder="Name or trade"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
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
                    className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg min-h-[44px]"
                  >
                    Confirm Delete
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

        {/* Sticky save button */}
        <div className="sticky bottom-0 px-4 py-3 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={updateTask.isPending || updateProgress.isPending}
            className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]"
          >
            {updateTask.isPending || updateProgress.isPending
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
