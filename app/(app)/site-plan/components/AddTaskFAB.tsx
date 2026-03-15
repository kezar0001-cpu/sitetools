"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { TaskType } from "@/types/siteplan";

interface AddTaskFABProps {
  onAdd: (type: TaskType) => void;
}

export function AddTaskFAB({ onAdd }: AddTaskFABProps) {
  const [open, setOpen] = useState(false);

  const options: { type: TaskType; label: string }[] = [
    { type: "phase", label: "Phase" },
    { type: "task", label: "Task" },
    { type: "subtask", label: "Subtask" },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden flex flex-col items-end gap-2">
      {/* Options */}
      {open &&
        options.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => {
              onAdd(type);
              setOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full shadow-lg text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
          >
            {label}
          </button>
        ))}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
        aria-label="Add task"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
