"use client";

import { useState } from "react";
import { X, Link2 } from "lucide-react";
import type { SitePlanTaskNode } from "@/types/siteplan";
import { useUpdateTask } from "@/hooks/useSitePlanTasks";

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
  const updateTask = useUpdateTask();

  // Parse existing predecessors (row numbers or IDs)
  const existingPreds = task.predecessors
    ? task.predecessors.split(",").map((p) => p.trim())
    : [];

  const [selectedPreds, setSelectedPreds] = useState<string[]>(existingPreds);

  // Available tasks to link (exclude self)
  const otherTasks = allTasks.filter((t) => t.id !== task.id);

  const togglePred = (rowNum: string) => {
    setSelectedPreds((prev) =>
      prev.includes(rowNum)
        ? prev.filter((p) => p !== rowNum)
        : [...prev, rowNum]
    );
  };

  const handleSave = () => {
    const predString = selectedPreds.join(", ");
    updateTask.mutate(
      {
        id: task.id,
        projectId: task.project_id,
        updates: { predecessors: predString || null },
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] z-50 max-w-md mx-auto bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-900">
              Link Predecessors
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
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
          {otherTasks.map((t, i) => {
            const rowNum = String(i + 1);
            const isSelected =
              selectedPreds.includes(rowNum) ||
              selectedPreds.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => togglePred(rowNum)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-slate-50 hover:bg-slate-50 ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <span className="w-8 text-xs text-slate-400 tabular-nums text-center shrink-0">
                  {rowNum}
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
            {selectedPreds.length} predecessor
            {selectedPreds.length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-700 min-h-[36px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateTask.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[36px]"
            >
              {updateTask.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
