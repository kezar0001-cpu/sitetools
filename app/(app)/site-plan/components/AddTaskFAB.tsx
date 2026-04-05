"use client";

import { Plus } from "lucide-react";
import type { TaskType } from "@/types/siteplan";

interface AddTaskFABProps {
  /** Called with the type matching the currently selected row's indent level, or "task" by default */
  onAdd: (type: TaskType) => void;
  /** The type to create, derived from the currently selected row */
  currentType?: TaskType;
}

export function AddTaskFAB({ onAdd, currentType = "task" }: AddTaskFABProps) {
  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden mb-[env(safe-area-inset-bottom)] flex flex-col items-end gap-2">
      <button
        onClick={() => onAdd(currentType)}
        className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
        aria-label="Add row"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
