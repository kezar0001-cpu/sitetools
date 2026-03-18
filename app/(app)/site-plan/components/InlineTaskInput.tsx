"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TaskType } from "@/types/siteplan";
import { useCreateTask } from "@/hooks/useSitePlanTasks";

interface InlineTaskInputProps {
  projectId: string;
  /** Current context for nesting: what parent to attach to */
  contextParentId: string | null;
  /** The type to create based on indent level */
  contextType: TaskType;
  /** Sort order for the new task */
  sortOrder: number;
  /** Callback after task is created (to scroll, etc.) */
  onCreated?: () => void;
  /** Callback when user presses Escape */
  onCancel?: () => void;
}

function getDefaultDates() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return {
    start: today.toISOString().split("T")[0],
    end: nextWeek.toISOString().split("T")[0],
  };
}

const indentPx = {
  phase: "pl-10",
  task: "pl-16",
  subtask: "pl-20",
  milestone: "pl-10",
};

const typeLabel: Record<TaskType, string> = {
  phase: "Phase",
  task: "Task",
  subtask: "Subtask",
  milestone: "Milestone",
};

export function InlineTaskInput({
  projectId,
  contextParentId,
  contextType,
  sortOrder,
  onCreated,
  onCancel,
}: InlineTaskInputProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>(contextType);
  const [parentId, setParentId] = useState<string | null>(contextParentId);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update type/parent when user presses Tab (indent) or Shift+Tab (outdent)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        // Indent: phase → task → subtask
        if (type === "phase") {
          setType("task");
          // Parent stays null (will be set from context)
        } else if (type === "task") {
          setType("subtask");
        }
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        // Outdent: subtask → task → phase
        if (type === "subtask") {
          setType("task");
        } else if (type === "task") {
          setType("phase");
          setParentId(null);
        }
      } else if (e.key === "Enter" && name.trim()) {
        e.preventDefault();
        submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, type]
  );

  const submit = () => {
    if (!name.trim()) return;
    const dates = getDefaultDates();
    createTask.mutate(
      {
        project_id: projectId,
        parent_id: type === "phase" ? null : parentId,
        name: name.trim(),
        type,
        start_date: dates.start,
        end_date: dates.end,
        sort_order: sortOrder,
      },
      {
        onSuccess: () => {
          setName("");
          onCreated?.();
          // Keep input focused for rapid entry
          inputRef.current?.focus();
        },
      }
    );
  };

  return (
    <div
      className={`flex items-center gap-2 py-2 px-2 border-b border-blue-200 bg-blue-50/50 min-h-[44px] ${indentPx[type]}`}
    >
      <span className="text-[10px] font-medium text-blue-500 uppercase w-14 shrink-0">
        {typeLabel[type]}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Type ${typeLabel[type].toLowerCase()} name, Enter to add, Tab to indent, Esc to cancel`}
        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 min-h-[32px]"
      />
      {name.trim() && (
        <button
          onClick={submit}
          disabled={createTask.isPending}
          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded min-h-[28px] shrink-0"
        >
          {createTask.isPending ? "..." : "Add"}
        </button>
      )}
    </div>
  );
}
