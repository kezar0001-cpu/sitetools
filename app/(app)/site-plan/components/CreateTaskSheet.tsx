"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { useCreateTask } from "@/hooks/useSitePlanTasks";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface CreateTaskSheetProps {
  projectId: string;
  type: TaskType;
  parentId?: string | null;
  parentNode?: SitePlanTaskNode | null;
  sortOrder?: number;
  onClose: () => void;
}

export function CreateTaskSheet({ projectId, type, parentId, parentNode, sortOrder, onClose }: CreateTaskSheetProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(parentNode?.start_date ?? "");
  const [endDate, setEndDate] = useState(parentNode?.end_date ?? "");
  const [responsible, setResponsible] = useState("");
  const [isMilestone, setIsMilestone] = useState(type === "milestone");
  const [dateError, setDateError] = useState<string | null>(null);
  const create = useCreateTask();

  const defaultDays = 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const today = new Date();
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() + defaultDays);
    const effectiveStart = startDate || toDateString(today);
    const effectiveEnd = endDate || toDateString(defaultEnd);
    if (effectiveEnd < effectiveStart) {
      setDateError("End date must be on or after start date.");
      return;
    }
    setDateError(null);
    create.mutate({
      project_id: projectId,
      parent_id: parentId ?? undefined,
      name: name.trim(),
      type: isMilestone ? "milestone" : "task",
      start_date: effectiveStart,
      end_date: effectiveEnd,
      responsible: responsible.trim() || undefined,
      sort_order: sortOrder,
    }, { onSuccess: () => onClose() });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col md:static md:inset-auto md:w-96 md:border-l md:border-slate-200 md:rounded-none md:shadow-none md:h-full focus:outline-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">New Task</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Excavate trench" required autoFocus className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isMilestone} onChange={(e) => setIsMilestone(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
              Milestone
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]" />
              </div>
            </div>
            {dateError && <p className="text-xs text-red-600">{dateError}</p>}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Responsible</label>
              <input type="text" value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Name or trade" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px]" />
            </div>
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <button type="submit" disabled={create.isPending || !name.trim()} className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]">{create.isPending ? "Creating..." : "Create Task"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
