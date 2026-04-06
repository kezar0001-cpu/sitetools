import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { SitePlanTask } from "@/types/siteplan";
import { useUpdateTask } from "@/hooks/useSitePlanTasks";

export interface UndoEntry {
  taskId: string;
  projectId: string;
  before: Partial<SitePlanTask>;
  after: Partial<SitePlanTask>;
}

function describeEntry(entry: UndoEntry): string {
  const keys = Object.keys(entry.before) as (keyof SitePlanTask)[];
  if (keys.includes("name") && entry.before.name !== undefined) {
    return `changed name of '${entry.before.name}'`;
  }
  if (keys.some((k) => k === "parent_id" || k === "type")) {
    return "changed indent level";
  }
  if (keys.includes("status")) {
    return "changed status";
  }
  if (keys.includes("start_date") || keys.includes("end_date")) {
    return "changed dates";
  }
  if (keys.includes("progress")) {
    return "changed progress";
  }
  const readableKey = keys[0]?.replace(/_/g, " ") ?? "field";
  return `changed ${readableKey}`;
}

export function useUndoRedo(updateTask: ReturnType<typeof useUpdateTask>) {
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const [revision, setRevision] = useState(0);

  // NOTE: The stacks are intentionally NOT cleared on task selection changes.
  // UndoEntry includes taskId/projectId so mutations always target the correct task
  // regardless of which task is currently selected.

  const pushUndo = useCallback(
    (entry: UndoEntry) => {
      undoStack.current.push(entry);
      redoStack.current = [];
      setRevision((r) => r + 1);
    },
    []
  );

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    updateTask.mutate({
      id: entry.taskId,
      projectId: entry.projectId,
      updates: entry.before as Parameters<typeof updateTask.mutate>[0]["updates"],
    }, {
      onError: () => toast.error("Failed to save. Please try again."),
    });
    setRevision((r) => r + 1);
  }, [updateTask]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    updateTask.mutate({
      id: entry.taskId,
      projectId: entry.projectId,
      updates: entry.after as Parameters<typeof updateTask.mutate>[0]["updates"],
    }, {
      onError: () => toast.error("Failed to save. Please try again."),
    });
    setRevision((r) => r + 1);
  }, [updateTask]);

  const undoTop = undoStack.current[undoStack.current.length - 1];
  const redoTop = redoStack.current[redoStack.current.length - 1];

  return {
    pushUndo,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    revision,
    undoLabel: undoTop ? describeEntry(undoTop) : undefined,
    redoLabel: redoTop ? describeEntry(redoTop) : undefined,
  };
}
