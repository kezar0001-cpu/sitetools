"use client";

import { useEffect, useState } from "react";
import { X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { SitePlanTaskNode } from "@/types/siteplan";
import {
  useTaskPredecessors,
  useSetTaskPredecessors,
} from "@/hooks/useSitePlanTasks";

interface LinkTasksDialogProps {
  task: SitePlanTaskNode;
  allTasks: SitePlanTaskNode[];
  onClose: () => void;
}

export function LinkTasksDialog({
  task,
  allTasks,
  onClose,
}: LinkTasksDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);
  const { data: existingRows = [], isLoading } = useTaskPredecessors(task.id);
  const setTaskPredecessors = useSetTaskPredecessors();

  // Initialise from join table; kept in sync locally as the user toggles
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    existingRows.map((r) => r.predecessor_id)
  );

  // Sync once the query resolves (handles first render before data arrives)
  useEffect(() => {
    if (isLoading) return;
    setSelectedIds(existingRows.map((r) => r.predecessor_id));
  }, [existingRows, isLoading]);

  // Available tasks to link (exclude self)
  const otherTasks = allTasks.filter((t) => t.id !== task.id);

  const togglePred = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-tasks-dialog-title"
        tabIndex={-1}
        className="fixed inset-x-4 top-[10%] z-50 max-w-md mx-auto bg-white rounded-xl shadow-xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-slate-500" />
            <span id="link-tasks-dialog-title" className="text-sm font-semibold text-slate-900">
              Link Predecessors
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close link predecessors dialog"
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-100">
          <p className="text-xs text-slate-500">
            Select tasks that must finish before{" "}
            <span className="font-medium text-slate-700">{task.name}</span>{" "}
            can start.
          </p>
        </div>

        {/* Task list */}
        <div className="max-h-80 overflow-y-auto">
          {otherTasks.map((t) => {
            const isSelected = selectedIds.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => togglePred(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-slate-50 hover:bg-slate-50 ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <span className="w-8 text-xs text-slate-400 tabular-nums text-center shrink-0">
                  {t.wbs_code || "—"}
                </span>
                <div
                  className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm truncate ${
                      t.type === "phase"
                        ? "font-semibold text-slate-900"
                        : "text-slate-700"
                    }`}
                  >
                    {t.name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {t.type}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {selectedIds.length} predecessor
            {selectedIds.length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={setTaskPredecessors.isPending}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-700 min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                setTaskPredecessors.mutate(
                  {
                    taskId: task.id,
                    predecessorIds: selectedIds,
                    projectId: task.project_id,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Predecessors saved");
                      onClose();
                    },
                    onError: (err) => {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to save predecessors",
                      );
                    },
                  },
                )
              }
              disabled={setTaskPredecessors.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]"
            >
              {setTaskPredecessors.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
