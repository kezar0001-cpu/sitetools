"use client";

import { useState } from "react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type {
  SitePlanTask,
  DelayCategory,
} from "@/types/siteplan";
import { DELAY_CATEGORIES } from "@/types/siteplan";
import {
  useDelayLogs,
  useCreateDelayLog,
  useDeleteDelayLog,
} from "@/hooks/useSitePlanDelays";

interface DelayLogDialogProps {
  task: SitePlanTask;
  projectId: string;
  onClose: () => void;
  /** Called after a successful delay log when impacts_completion=true, with the affected successor task IDs */
  onImpact?: (affectedTaskIds: string[]) => void;
}

export function DelayLogDialog({
  task,
  projectId,
  onClose,
  onImpact,
}: DelayLogDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);
  const { data: logs } = useDelayLogs(task.id);
  const createDelay = useCreateDelayLog();
  const deleteDelay = useDeleteDelayLog();

  const [delayDays, setDelayDays] = useState(1);
  const [delayReason, setDelayReason] = useState("");
  const [delayCategory, setDelayCategory] = useState<DelayCategory>("Weather");
  const [impactsCompletion, setImpactsCompletion] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canSubmit = delayDays > 0 && delayReason.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createDelay.mutate(
      {
        payload: {
          task_id: task.id,
          delay_days: delayDays,
          delay_reason: delayReason.trim(),
          delay_category: delayCategory,
          impacts_completion: impactsCompletion,
        },
        projectId,
      },
      {
        onSuccess: (data) => {
          setDelayDays(1);
          setDelayReason("");
          setDelayCategory("Weather");
          setImpactsCompletion(true);
          if (impactsCompletion && onImpact) {
            const ids: string[] = data?.affected_task_ids ?? [];
            if (ids.length > 0) onImpact(ids);
          }
        },
      }
    );
  };

  const handleDelete = (log: NonNullable<typeof logs>[number]) => {
    deleteDelay.mutate({
      id: log.id,
      taskId: task.id,
      projectId,
      impacts_completion: log.impacts_completion,
    });
    setConfirmDeleteId(null);
  };

  return (
    <ComponentErrorBoundary>
      <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Dialog — bottom sheet on mobile, centered modal on desktop */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delay-log-dialog-title"
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-xl shadow-xl max-h-[90vh] flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 id="delay-log-dialog-title" className="text-sm font-bold text-slate-900">Log Delay</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close delay log dialog"
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Task info */}
          <div className="text-xs text-slate-500">
            Task: <span className="font-medium text-slate-700">{task.wbs_code} {task.name}</span>
          </div>

          {/* Delay form */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Delay Days
                </label>
                <input
                  type="number"
                  min={1}
                  value={delayDays}
                  onChange={(e) => setDelayDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Category
                </label>
                <select
                  value={delayCategory}
                  onChange={(e) => setDelayCategory(e.target.value as DelayCategory)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                >
                  {DELAY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                rows={2}
                placeholder="Describe the reason for the delay..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none min-h-[44px]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={impactsCompletion}
                onChange={(e) => setImpactsCompletion(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">
                Impacts planned end date (shifts schedule)
              </span>
            </label>

            {impactsCompletion && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                This will push the task end date by {delayDays} day{delayDays !== 1 ? "s" : ""} and cascade to all dependent tasks.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createDelay.isPending}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {createDelay.isPending ? "Logging..." : "Log Delay"}
            </button>
          </div>

          {/* Existing delay logs */}
          {logs && logs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Delay History ({logs.length})
              </h3>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border border-slate-200 rounded-lg bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-red-600">
                            +{log.delay_days}d
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {log.delay_category}
                          </span>
                          {log.impacts_completion && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                              Shifts schedule
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-1 break-words">
                          {log.delay_reason}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(log.logged_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {confirmDeleteId === log.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(log)}
                              className="px-2 py-1 text-xs text-white bg-red-600 rounded min-h-[44px]"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-500 min-h-[44px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(log.id)}
                            aria-label="Delete delay log"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
    </ComponentErrorBoundary>
  );
}
