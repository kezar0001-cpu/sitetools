import { useState, useRef, useEffect, useCallback } from "react";
import type { SitePlanTask, UpdateTaskPayload } from "@/types/siteplan";
import type { useUpdateTask } from "@/hooks/useSitePlanTasks";

// Fields tracked for remote-edit conflict detection
export const CONFLICT_FIELDS = [
  "name", "status", "progress", "start_date", "end_date",
  "actual_start", "actual_end", "predecessors", "responsible",
  "assigned_to", "comments", "notes",
] as const;

export type ConflictField = (typeof CONFLICT_FIELDS)[number];

export const CONFLICT_FIELD_LABELS: Record<ConflictField, string> = {
  name: "Task Name",
  status: "Status",
  progress: "Progress",
  start_date: "Planned Start",
  end_date: "Planned End",
  actual_start: "Actual Start",
  actual_end: "Actual End",
  predecessors: "Predecessors",
  responsible: "Responsible",
  assigned_to: "Assigned To",
  comments: "Comments",
  notes: "Notes",
};

/** Fields where character-level diff / merge is meaningful */
export const TEXT_CONFLICT_FIELDS = new Set<ConflictField>([
  "name", "predecessors", "responsible", "assigned_to", "comments", "notes",
]);

/** Fields that hold ISO date strings — support delta display and midpoint merge */
export const DATE_CONFLICT_FIELDS = new Set<ConflictField>([
  "start_date", "end_date", "actual_start", "actual_end",
]);

/** Fields that hold numeric progress values — support average merge */
export const PROGRESS_CONFLICT_FIELDS = new Set<ConflictField>(["progress"]);

export interface ConflictEntry {
  field: ConflictField;
  remoteValue: unknown;
  changedBy: string | null;
  changedAt: string;
}

// ─── localStorage preference helpers ────────────────────────
// Key pattern aligned with task requirement: conflictResolution_${fieldName}

const PREF_KEY = (field: ConflictField) => `conflictResolution_${field}`;

function getFieldPref(
  field: ConflictField
): "keep_local" | "use_remote" | "merge" | null {
  try {
    const v = localStorage.getItem(PREF_KEY(field));
    if (v === "keep_local" || v === "use_remote" || v === "merge") return v;
    return null;
  } catch {
    return null;
  }
}

export function saveFieldPref(
  field: ConflictField,
  choice: "keep_local" | "use_remote" | "merge"
) {
  try {
    localStorage.setItem(PREF_KEY(field), choice);
  } catch {
    /* ignore */
  }
}

interface ConflictDetectionDeps {
  debounceTimers: React.MutableRefObject<
    Record<string, ReturnType<typeof setTimeout>>
  >;
  setForm: React.Dispatch<React.SetStateAction<UpdateTaskPayload>>;
  saveField: (field: string, value: unknown) => void;
  updateTask: ReturnType<typeof useUpdateTask>;
  formRef: React.MutableRefObject<UpdateTaskPayload>;
}

/**
 * Detects when another user edits a field on the same task while the local
 * user has pending changes, and surfaces a resolution UI.
 *
 * Also flushes pending debounced saves when the user switches to a different
 * task, so no edits are lost.
 */
export function useConflictDetection(
  task: SitePlanTask,
  {
    debounceTimers,
    setForm,
    saveField,
    updateTask,
    formRef,
  }: ConflictDetectionDeps
) {
  // Last values confirmed by the server for each tracked field
  const lastKnownValues = useRef<Partial<Record<ConflictField, unknown>>>(
    Object.fromEntries(
      CONFLICT_FIELDS.map((f) => [f, task[f as keyof SitePlanTask]])
    )
  );

  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);

  // Skip conflict detection on the render immediately after a task-switch
  const justSwitchedRef = useRef(false);

  // Track the previous task's identity so pending saves flush to the right row
  const prevTaskIdRef = useRef<string>(task.id);
  const prevTaskProjectIdRef = useRef<string>(task.project_id);

  // ─── Detect remote field changes ─────────────────────────────
  // Fires whenever the `task` prop changes (Realtime UPDATE from subscription).
  useEffect(() => {
    if (justSwitchedRef.current) {
      justSwitchedRef.current = false;
      return;
    }

    const newConflicts: ConflictEntry[] = [];
    const autoAcceptRemote: { field: ConflictField; remoteValue: unknown }[] =
      [];

    for (const field of CONFLICT_FIELDS) {
      const remoteValue = task[field as keyof SitePlanTask] as unknown;
      const knownValue = lastKnownValues.current[field];

      if (remoteValue === knownValue) continue;

      if (Object.hasOwn(debounceTimers.current, field)) {
        // Remote changed AND a local edit is pending — potential conflict
        const pref = getFieldPref(field);

        if (pref === "keep_local") {
          // Accept remote as the new baseline; keep local pending save
          lastKnownValues.current[field] = remoteValue;
        } else if (pref === "use_remote") {
          // Cancel local save, adopt remote value
          clearTimeout(debounceTimers.current[field]);
          delete debounceTimers.current[field];
          autoAcceptRemote.push({ field, remoteValue });
          lastKnownValues.current[field] = remoteValue;
        } else {
          // No saved preference: surface conflict UI
          newConflicts.push({
            field,
            remoteValue,
            changedBy: task.updated_by,
            changedAt: task.updated_at,
          });
        }
      } else {
        // No pending local edit: silently accept the remote value
        lastKnownValues.current[field] = remoteValue;
        setForm((f) => ({ ...f, [field]: remoteValue }));
      }
    }

    if (autoAcceptRemote.length > 0) {
      setForm((f) => {
        const next = { ...f };
        for (const { field, remoteValue } of autoAcceptRemote) {
          (next as Record<string, unknown>)[field] = remoteValue;
        }
        return next;
      });
    }

    if (newConflicts.length > 0) {
      setConflicts((prev) => {
        const merged = prev.filter(
          (c) => !newConflicts.find((n) => n.field === c.field)
        );
        return [...merged, ...newConflicts];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  // ─── Task switch: flush pending saves, reset conflict state ──
  useEffect(() => {
    const pendingKeys = Object.keys(debounceTimers.current);

    if (pendingKeys.length > 0) {
      const updates: UpdateTaskPayload = {};
      for (const key of pendingKeys) {
        clearTimeout(debounceTimers.current[key]);
        (updates as Record<string, unknown>)[key] =
          formRef.current[key as keyof UpdateTaskPayload];
      }
      debounceTimers.current = {};

      updateTask.mutate({
        id: prevTaskIdRef.current,
        projectId: prevTaskProjectIdRef.current,
        updates,
      });
    } else {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
    }

    prevTaskIdRef.current = task.id;
    prevTaskProjectIdRef.current = task.project_id;
    justSwitchedRef.current = true;
    lastKnownValues.current = Object.fromEntries(
      CONFLICT_FIELDS.map((f) => [f, task[f as keyof SitePlanTask]])
    );
    setConflicts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // ─── Resolution handlers ──────────────────────────────────────

  const handleKeepLocal = useCallback(
    (field: ConflictField, remember: boolean) => {
      if (remember) saveFieldPref(field, "keep_local");
      lastKnownValues.current[field] = task[field as keyof SitePlanTask] as unknown;
      setConflicts((prev) => prev.filter((c) => c.field !== field));
    },
    [task]
  );

  const handleUseRemote = useCallback(
    (field: ConflictField, remoteValue: unknown, remember: boolean) => {
      if (remember) saveFieldPref(field, "use_remote");
      if (debounceTimers.current[field]) {
        clearTimeout(debounceTimers.current[field]);
        delete debounceTimers.current[field];
      }
      setForm((f) => ({ ...f, [field]: remoteValue }));
      lastKnownValues.current[field] = remoteValue;
      setConflicts((prev) => prev.filter((c) => c.field !== field));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setForm]
  );

  /**
   * Apply a resolved value for any field type:
   * - Text fields: the manually edited merge text (or empty string → null)
   * - Date fields: an ISO date string chosen/computed from local/remote/midpoint
   * - Progress fields: a number chosen or averaged from local + remote
   */
  const handleApplyMerge = useCallback(
    (field: ConflictField, resolvedValue: unknown, remember: boolean) => {
      if (remember) saveFieldPref(field, "merge");
      if (debounceTimers.current[field]) {
        clearTimeout(debounceTimers.current[field]);
        delete debounceTimers.current[field];
      }
      // Coerce empty string to null (clears a text/date field), keep 0 as-is for numbers
      const value = resolvedValue === "" ? null : resolvedValue;
      setForm((f) => ({ ...f, [field]: value }));
      saveField(field, value);
      lastKnownValues.current[field] = value;
      setConflicts((prev) => prev.filter((c) => c.field !== field));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveField, setForm]
  );

  return { conflicts, handleKeepLocal, handleUseRemote, handleApplyMerge };
}
