"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCreateProject } from "@/hooks/useSitePlan";

interface CreateProjectPanelProps {
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function CreateProjectPanel({
  onClose,
  onCreated,
}: CreateProjectPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const create = useCreateProject();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
      },
      {
        onSuccess: (project) => {
          onCreated?.(project.id);
          onClose();
        },
      }
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            New Project
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. M50 Road Widening Phase 2"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional project description..."
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
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
          </div>

          <div className="px-4 py-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={create.isPending || !name.trim() || !startDate || !endDate}
              className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]"
            >
              {create.isPending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
