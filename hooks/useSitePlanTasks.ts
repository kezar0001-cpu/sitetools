"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sitePlanKeys } from "@/lib/queryKeys";
import type {
  SitePlanTask,
  SitePlanProgressLog,
  CreateTaskPayload,
  UpdateTaskPayload,
} from "@/types/siteplan";

/** A row from siteplan_task_predecessors */
export interface TaskPredecessorRow {
  task_id: string;
  predecessor_id: string;
}
import { computeTaskStatus } from "@/types/siteplan";
import {
  applyReorderMoves,
  getAncestorIds,
  normalizeSiblingSortOrders,
  wouldCreateHierarchyCycle,
} from "@/lib/siteplanTree";

const tasksKey = sitePlanKeys.tasks;
const progressLogKey = sitePlanKeys.progressLog;
const taskPredecessorsKey = sitePlanKeys.taskPredecessors;

// ─── Queries ────────────────────────────────────────────────

export function useSitePlanTasks(projectId: string) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;

    // Cleanup any previous subscription before creating a new one
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`siteplan_tasks_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "siteplan_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          qc.setQueryData<SitePlanTask[]>(tasksKey(projectId), (prev) => {
            if (!prev) return prev;
            if (eventType === "INSERT") {
              return [...prev, newRow as SitePlanTask];
            }
            if (eventType === "UPDATE") {
              return prev.map((t) =>
                t.id === (newRow as SitePlanTask).id ? (newRow as SitePlanTask) : t
              );
            }
            if (eventType === "DELETE") {
              return prev.filter((t) => t.id !== (oldRow as { id: string }).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [projectId, qc]);

  return useQuery<SitePlanTask[]>({
    queryKey: tasksKey(projectId),
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from("siteplan_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      if (!tasks || tasks.length === 0) return [];

      // Hydrate the `predecessors` string from the join table so that all
      // downstream consumers (Gantt arrows, critical path, PRED column) work
      // correctly after the migration away from the text column.
      const taskIds = tasks.map((t) => t.id);
      const { data: predRows } = await supabase
        .from("siteplan_task_predecessors")
        .select("task_id, predecessor_id")
        .in("task_id", taskIds);

      if (predRows && predRows.length > 0) {
        const idToWbs = new Map<string, string>(tasks.map((t) => [t.id, t.wbs_code]));
        const predMap = new Map<string, string[]>();
        for (const row of predRows) {
          const wbs = idToWbs.get(row.predecessor_id);
          if (wbs) {
            const existing = predMap.get(row.task_id) ?? [];
            existing.push(wbs);
            predMap.set(row.task_id, existing);
          }
        }
        return tasks.map((t) => {
          const wbsCodes = predMap.get(t.id);
          return wbsCodes?.length ? { ...t, predecessors: wbsCodes.join(", ") } : t;
        });
      }

      return tasks;
    },
    enabled: !!projectId,
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useProgressLog(taskId: string | null) {
  return useQuery<SitePlanProgressLog[]>({
    queryKey: progressLogKey(taskId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_progress_log")
        .select("*")
        .eq("task_id", taskId!)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!taskId,
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

/**
 * Fetches the predecessor UUIDs for a single task from the join table.
 */
export function useTaskPredecessors(taskId: string | null) {
  return useQuery<TaskPredecessorRow[]>({
    queryKey: taskPredecessorsKey(taskId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_task_predecessors")
        .select("task_id, predecessor_id")
        .eq("task_id", taskId!);
      if (error) throw error;
      return (data ?? []) as TaskPredecessorRow[];
    },
    enabled: !!taskId,
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

/**
 * Replaces all predecessor links for a task atomically:
 * deletes existing rows then inserts the new set.
 *
 * Before touching the database a DFS cycle check is run against the
 * in-memory task graph.  If the proposed links would create a circular
 * dependency the mutation aborts and shows a descriptive toast.
 */
export function useSetTaskPredecessors() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { taskId: string; predecessorIds: string[]; projectId: string }
  >({
    mutationFn: async ({ taskId, predecessorIds, projectId }) => {
      // ── Cycle detection ────────────────────────────────────────
      const tasks = qc.getQueryData<SitePlanTask[]>(tasksKey(projectId)) ?? [];

      if (tasks.length > 0) {
        const taskById = new Map<string, SitePlanTask>(tasks.map((t) => [t.id, t]));
        const wbsToId = new Map<string, string>(tasks.map((t) => [t.wbs_code, t.id]));

        // Build adjacency map: nodeId → predecessor IDs
        // (same direction used by criticalPath.ts: edge points from task to its predecessors)
        const adj = new Map<string, string[]>();
        for (const t of tasks) {
          const preds: string[] = [];
          if (t.predecessors) {
            for (const raw of t.predecessors.split(",")) {
              const code = raw.trim().replace(/FS$/i, "");
              const predId = wbsToId.get(code);
              if (predId) preds.push(predId);
            }
          }
          adj.set(t.id, preds);
        }

        // Apply the proposed new links for this task
        adj.set(taskId, predecessorIds);

        // DFS from taskId following predecessor edges.
        // If we encounter a node already on the current path, a cycle exists.
        const path: string[] = [];
        const onPath = new Set<string>();

        const dfs = (nodeId: string): string[] | null => {
          if (onPath.has(nodeId)) {
            // Return the cycle portion of the path
            const cycleStart = path.indexOf(nodeId);
            return [...path.slice(cycleStart), nodeId];
          }

          onPath.add(nodeId);
          path.push(nodeId);

          for (const predId of adj.get(nodeId) ?? []) {
            const result = dfs(predId);
            if (result) return result;
          }

          path.pop();
          onPath.delete(nodeId);
          return null;
        };

        const cycle = dfs(taskId);
        if (cycle) {
          const cycleNames = cycle.map((id) => {
            const t = taskById.get(id);
            return t ? t.name : id;
          });
          toast.error(
            `Cannot save: this would create a circular dependency (${cycleNames.join(" → ")})`,
            { duration: Infinity }
          );
          const err = new Error("Cyclic dependency detected");
          err.name = "CyclicDependencyError";
          throw err;
        }
      }
      // ── End cycle detection ────────────────────────────────────

      // Delete existing links for this task
      const { error: delErr } = await supabase
        .from("siteplan_task_predecessors")
        .delete()
        .eq("task_id", taskId);
      if (delErr) throw delErr;

      if (predecessorIds.length === 0) return;

      const rows = predecessorIds.map((predecessor_id) => ({
        task_id: taskId,
        predecessor_id,
      }));
      const { error: insErr } = await supabase
        .from("siteplan_task_predecessors")
        .insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: (_data, { taskId, projectId }) => {
      qc.invalidateQueries({ queryKey: taskPredecessorsKey(taskId) });
      qc.invalidateQueries({ queryKey: tasksKey(projectId) });
    },
    onError: (err) => {
      // Cycle errors already show their own toast; suppress the generic one.
      if (err.name === "CyclicDependencyError") return;
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation<SitePlanTask, Error, CreateTaskPayload>({
    mutationFn: async (payload: CreateTaskPayload) => {
      const { data, error } = await supabase.rpc("create_siteplan_task", {
        p_project_id:  payload.project_id,
        p_name:        payload.name,
        p_type:        payload.type,
        p_start_date:  payload.start_date,
        p_end_date:    payload.end_date,
        p_parent_id:   payload.parent_id ?? null,
        p_status:      "not_started",
        p_progress:    0,
        p_sort_order:  payload.sort_order ?? 0,
        p_responsible: payload.responsible ?? null,
        p_assigned_to: payload.assigned_to ?? null,
        p_comments:    payload.comments ?? null,
        p_notes:       payload.notes ?? null,
        p_predecessors: payload.predecessors ?? null,
      });
      if (error) throw error;
      // rpc with RETURNS SETOF returns an array; we always get exactly one row
      return (Array.isArray(data) ? data[0] : data) as SitePlanTask;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: tasksKey(data.project_id) });
      toast.success("Task created", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation<SitePlanTask, Error, { id: string; projectId: string; updates: UpdateTaskPayload }, { prev?: SitePlanTask[] }>({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: UpdateTaskPayload;
    }) => {
      const cachedTasks = qc.getQueryData<SitePlanTask[]>(tasksKey(projectId)) ?? [];
      const cachedTask = cachedTasks.find((task) => task.id === id);

      // Guard rail: structural mutation must never introduce a cycle.
      if (
        cachedTask &&
        updates.parent_id !== undefined &&
        wouldCreateHierarchyCycle(cachedTasks, id, updates.parent_id ?? null)
      ) {
        const error = new Error("Invalid hierarchy: this move would create a cycle");
        error.name = "HierarchyCycleError";
        throw error;
      }

      // Auto-compute status based on progress (read from cache, no extra DB call)
      if (updates.progress !== undefined && cachedTask && cachedTask.status !== "on_hold") {
        updates.status = computeTaskStatus(
          updates.progress,
          updates.end_date ?? cachedTask.end_date
        );
      }

      const { data, error } = await supabase
        .from("siteplan_tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SitePlanTask;
    },
    onMutate: async ({ id, projectId, updates }) => {
      // Optimistic update (patch only changed task + ancestor chain)
      await qc.cancelQueries({ queryKey: tasksKey(projectId) });
      const prev = qc.getQueryData<SitePlanTask[]>(tasksKey(projectId));
      if (prev) {
        const byId = new Map(prev.map((task) => [task.id, task]));
        const current = byId.get(id);
        if (current) {
          byId.set(id, { ...current, ...updates });
          const touched = new Set([id, ...getAncestorIds(prev, id)]);
          qc.setQueryData(
            tasksKey(projectId),
            prev.map((task) => (touched.has(task.id) ? byId.get(task.id) ?? task : task))
          );
        }
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success("Task updated", { duration: 3000 });
    },
    onError: (err, { projectId }, context) => {
      if (context?.prev) {
        qc.setQueryData(tasksKey(projectId), context.prev);
      }
      if (err.name === "HierarchyCycleError") {
        toast.error("Invalid hierarchy: task cannot be moved under itself or its descendants", { duration: Infinity });
        return;
      }
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
    onSettled: (_data, _err, { projectId }) => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId) });
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  const updateTask = useUpdateTask();

  return useMutation<void, Error, { taskId: string; projectId: string; progressBefore: number; progressAfter: number; statusAfter?: UpdateTaskPayload["status"]; note?: string }>({
    mutationFn: async ({
      taskId,
      projectId,
      progressBefore,
      progressAfter,
      statusAfter,
      note,
    }: {
      taskId: string;
      projectId: string;
      progressBefore: number;
      progressAfter: number;
      statusAfter?: UpdateTaskPayload["status"];
      note?: string;
    }) => {
      // Log progress change
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("siteplan_progress_log").insert({
        task_id: taskId,
        progress_before: progressBefore,
        progress_after: progressAfter,
        note: note ?? null,
        logged_by: user!.id,
      });

      // Update task
      await updateTask.mutateAsync({
        id: taskId,
        projectId,
        updates: {
          progress: progressAfter,
          ...(statusAfter ? { status: statusAfter } : {}),
        },
      });
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId) });
      toast.success("Progress updated", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
    onSettled: (_data, _err, { taskId }) => {
      qc.invalidateQueries({ queryKey: progressLogKey(taskId) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation<string, Error, { id: string; projectId: string }>({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from("siteplan_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId) });
      toast.success("Task deleted", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

export function useReorderTask() {
  const qc = useQueryClient();
  return useMutation<void, Error, { projectId: string; moves: { id: string; sort_order: number; parent_id: string | null }[] }, { prev?: SitePlanTask[] }>({
    mutationFn: async ({
      projectId,
      moves,
    }: {
      projectId: string;
      moves: { id: string; sort_order: number; parent_id: string | null }[];
    }) => {
      const cachedTasks = qc.getQueryData<SitePlanTask[]>(tasksKey(projectId)) ?? [];
      const projected = applyReorderMoves(cachedTasks, moves);

      for (const move of moves) {
        const movedTask = projected.find((task) => task.id === move.id);
        const nextParentId = movedTask?.parent_id ?? null;
        if (wouldCreateHierarchyCycle(projected, move.id, nextParentId)) {
          const error = new Error("Invalid hierarchy: this move would create a cycle");
          error.name = "HierarchyCycleError";
          throw error;
        }
      }

      const normalizedMoves = normalizeSiblingSortOrders(projected);
      const updateRows = normalizedMoves.length > 0 ? normalizedMoves : moves;

      // Atomic reorder via Postgres RPC — single transaction
      const { error } = await supabase.rpc("reorder_siteplan_tasks", {
        updates: updateRows.map(({ id, sort_order, parent_id }) => ({
          id,
          sort_order,
          parent_id: parent_id ?? null,
        })),
      });
      if (error) throw error;
    },
    onMutate: async ({ projectId, moves }) => {
      await qc.cancelQueries({ queryKey: tasksKey(projectId) });
      const prev = qc.getQueryData<SitePlanTask[]>(tasksKey(projectId));
      if (prev) {
        const projected = applyReorderMoves(prev, moves);
        const normalizedMoves = normalizeSiblingSortOrders(projected);
        const finalProjected = applyReorderMoves(projected, normalizedMoves);
        qc.setQueryData(tasksKey(projectId), finalProjected);
      }
      return { prev };
    },
    onError: (err, { projectId }, context) => {
      if (context?.prev) {
        qc.setQueryData(tasksKey(projectId), context.prev);
      }
      if (err.name === "HierarchyCycleError") {
        toast.error("Invalid hierarchy: task cannot be moved under itself or its descendants", { duration: Infinity });
        return;
      }
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
    onSettled: (_data, _err, { projectId }) => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId) });
    },
  });
}

export function useBulkCreateTasks() {
  const qc = useQueryClient();
  return useMutation<SitePlanTask[], Error, { projectId: string; tasks: Omit<CreateTaskPayload, "project_id">[] }>({
    mutationFn: async ({
      projectId,
      tasks,
    }: {
      projectId: string;
      tasks: Omit<CreateTaskPayload, "project_id">[];
    }) => {
      const rows = tasks.map((t) => ({ ...t, project_id: projectId }));
      const { data, error } = await supabase
        .from("siteplan_tasks")
        .insert(rows)
        .select();
      if (error) throw error;
      return data as SitePlanTask[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        qc.invalidateQueries({ queryKey: tasksKey(data[0].project_id) });
      }
      toast.success("Tasks imported", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

/**
 * Hierarchical bulk import: inserts tasks in waves so parent UUIDs exist
 * before child rows reference them.
 *
 * Each item in `tasks` must include a `_tempIndex` (its position in the flat
 * list) and a `_parentIndex` (the _tempIndex of its parent, or -1 for roots).
 * The hook resolves these to real parent_id UUIDs during insertion.
 */
export interface HierarchicalTask
  extends Omit<CreateTaskPayload, "project_id" | "predecessors"> {
  _tempIndex: number;
  _parentIndex: number;
  /** Resolved predecessor _tempIndex values (not UUIDs yet). */
  _predecessorIndices?: number[];
}

export function useHierarchicalImport() {
  const qc = useQueryClient();
  return useMutation<SitePlanTask[], Error, { projectId: string; tasks: HierarchicalTask[] }>({
    mutationFn: async ({
      projectId,
      tasks,
    }: {
      projectId: string;
      tasks: HierarchicalTask[];
    }) => {
      // Map from _tempIndex → real UUID (filled as we insert)
      const indexToId = new Map<number, string>();
      const allInserted: SitePlanTask[] = [];

      // Group tasks into waves by depth: roots first, then their children, etc.
      // A task is "ready" when its _parentIndex is -1 or already in indexToId.
      const remaining = [...tasks];
      let safety = 0;
      const MAX_WAVES = 20;

      while (remaining.length > 0 && safety < MAX_WAVES) {
        safety++;
        const ready: HierarchicalTask[] = [];
        const deferred: HierarchicalTask[] = [];

        for (const t of remaining) {
          if (
            t._parentIndex === -1 ||
            indexToId.has(t._parentIndex)
          ) {
            ready.push(t);
          } else {
            deferred.push(t);
          }
        }

        if (ready.length === 0) {
          // Remaining tasks have unresolvable parents — insert as roots
          for (const t of deferred) {
            ready.push({ ...t, _parentIndex: -1 });
          }
          deferred.length = 0;
        }

        // Build insert rows with resolved parent_id (strip all internal fields)
        const rows = ready.map((t) => {
          const parentId =
            t._parentIndex >= 0
              ? indexToId.get(t._parentIndex) ?? null
              : null;
          const { _tempIndex, _parentIndex, _predecessorIndices, ...rest } = t;
          void _tempIndex;
          void _parentIndex;
          void _predecessorIndices;
          return { ...rest, project_id: projectId, parent_id: parentId };
        });

        const { data, error } = await supabase
          .from("siteplan_tasks")
          .insert(rows)
          .select();
        if (error) throw error;

        // Map returned IDs back to temp indices
        const inserted = (data ?? []) as SitePlanTask[];
        for (let i = 0; i < inserted.length; i++) {
          indexToId.set(ready[i]._tempIndex, inserted[i].id);
          allInserted.push(inserted[i]);
        }

        remaining.length = 0;
        remaining.push(...deferred);
      }

      // Insert predecessor links using the resolved tempIndex → UUID map
      const predRows: { task_id: string; predecessor_id: string }[] = [];
      for (const t of tasks) {
        if (!t._predecessorIndices?.length) continue;
        const taskId = indexToId.get(t._tempIndex);
        if (!taskId) continue;
        for (const predIdx of t._predecessorIndices) {
          const predId = indexToId.get(predIdx);
          if (predId) predRows.push({ task_id: taskId, predecessor_id: predId });
        }
      }
      if (predRows.length > 0) {
        const { error: predErr } = await supabase
          .from("siteplan_task_predecessors")
          .insert(predRows);
        if (predErr) throw predErr;
      }

      return allInserted;
    },
    onSuccess: (data: SitePlanTask[], variables) => {
      qc.invalidateQueries({ queryKey: ["sitePlanTasks", variables.projectId] });
      if (data.length > 0) {
        qc.invalidateQueries({ queryKey: tasksKey(data[0].project_id) });
      }
      toast.success("Tasks imported", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}
