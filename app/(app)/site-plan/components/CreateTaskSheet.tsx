"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { TaskType } from "@/types/siteplan";
import { useCreateTask } from "@/hooks/useSitePlanTasks";

interface CreateTaskSheetProps {
  projectId: string;
  type: TaskType;
  parentId?: string | null;
  onClose: () => void;
}

export function CreateTaskSheet({
  projectId,
  type,
  parentId,
  onClose,
}: CreateTaskSheetProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [responsible, setResponsible] = useState("");
  const create = useCreateTask();

  const typeLabel = type === "phase" ? "Phase" : type === "task" ? "Task" : "Subtask";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    create.mutate(
      {
        project_id: projectId,
        parent_id: parentId ?? undefined,
        name: name.trim(),
        type,
        start_date: startDate,
        end_date: endDate,
        responsible: responsible.trim() || undefined,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col md:static md:inset-auto md:w-96 md:border-l md:border-slate-200 md:rounded-none md:shadow-none md:h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            New {typeLabel}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${type === "phase" ? "Earthworks" : "Excavate trench"}`}
                required
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Responsible
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Name or trade"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={create.isPending || !name.trim() || !startDate || !endDate}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]"
            >
              {create.isPending ? "Creating..." : `Create ${typeLabel}`}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
