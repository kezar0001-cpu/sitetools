"use client";

import { useState } from "react";
import { X, Bookmark, Trash2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { SitePlanTask } from "@/types/siteplan";
import {
  useSitePlanBaselines,
  useSaveBaseline,
  useDeleteBaseline,
} from "@/hooks/useSitePlanBaselines";

interface BaselineDialogProps {
  projectId: string;
  tasks: SitePlanTask[];
  onClose: () => void;
}

export function BaselineDialog({
  projectId,
  tasks,
  onClose,
}: BaselineDialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);
  const { data: baselines } = useSitePlanBaselines(projectId);
  const saveBaseline = useSaveBaseline();
  const deleteBaseline = useDeleteBaseline();
  const [name, setName] = useState(
    `Baseline ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
  );

  const handleSave = () => {
    if (!name.trim() || tasks.length === 0) return;
    saveBaseline.mutate(
      { projectId, name: name.trim(), tasks },
      { onSuccess: () => setName("") }
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baseline-dialog-title"
        tabIndex={-1}
        className="fixed inset-x-4 top-[15%] z-50 max-w-md mx-auto bg-white rounded-xl shadow-xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-slate-500" />
            <span id="baseline-dialog-title" className="text-sm font-semibold text-slate-900">
              Baselines
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Save new baseline */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-500 mb-2">
            Save a snapshot of the current schedule to compare progress later.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Baseline name"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px]"
            />
            <button
              onClick={handleSave}
              disabled={saveBaseline.isPending || !name.trim() || tasks.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[40px] shrink-0"
            >
              {saveBaseline.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Existing baselines */}
        <div className="max-h-64 overflow-y-auto">
          {!baselines || baselines.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              No baselines saved yet
            </div>
          ) : (
            baselines.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {b.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(b.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {(b.snapshot as unknown as SitePlanTask[]).length} tasks
                  </p>
                </div>
                <button
                  onClick={() =>
                    deleteBaseline.mutate({ id: b.id, projectId })
                  }
                  title="Delete baseline"
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
