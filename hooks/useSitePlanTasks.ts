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
import { computeTaskStatus, generateWbsCode } from "@/types/siteplan";

const tasksKey = sitePlanKeys.tasks;
const progressLogKey = sitePlanKeys.progressLog;

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
        () => {
          qc.invalidateQueries({ queryKey: tasksKey(projectId) });
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
      const { data, error } = await supabase
        .from("siteplan_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
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
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation<SitePlanTask, Error, CreateTaskPayload>({
    mutationFn: async (payload: CreateTaskPayload) => {
      // Compute WBS code from sibling count at target level
      let siblingQuery = supabase
        .from("siteplan_tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", payload.project_id);

      if (payload.parent_id) {
        siblingQuery = siblingQuery.eq("parent_id", payload.parent_id);
      } else {
        siblingQuery = siblingQuery.is("parent_id", null);
      }

      const { count } = await siblingQuery.then((res) => ({ count: res.count ?? 0 }));

      // If parent exists, get parent's WBS code
      let parentWbs: string | null = null;
      if (payload.parent_id) {
        const { data: parent } = await supabase
          .from("siteplan_tasks")
          .select("wbs_code")
          .eq("id", payload.parent_id)
          .single();
        parentWbs = parent?.wbs_code ?? null;
      }

      const wbs_code = generateWbsCode(parentWbs, count);

      const { data, error } = await supabase
        .from("siteplan_tasks")
        .insert({ ...payload, wbs_code })
        .select()
        .single();
      if (error) throw error;
      return data as SitePlanTask;
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
      // Auto-compute status based on progress
      if (updates.progress !== undefined) {
        const { data: existing } = await supabase
          .from("siteplan_tasks")
          .select("end_date, status")
          .eq("id", id)
          .single();
        if (existing && existing.status !== "on_hold") {
          updates.status = computeTaskStatus(
            updates.progress,
            updates.end_date ?? existing.end_date
          );
        }
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
      // Optimistic update
      await qc.cancelQueries({ queryKey: tasksKey(projectId) });
      const prev = qc.getQueryData<SitePlanTask[]>(tasksKey(projectId));
      if (prev) {
        qc.setQueryData(
          tasksKey(projectId),
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success("Task updated", { duration: 3000 });
    },
    onError: (_err, { projectId }, context) => {
      if (context?.prev) {
        qc.setQueryData(tasksKey(projectId), context.prev);
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

  return useMutation<void, Error, { taskId: string; projectId: string; progressBefore: number; progressAfter: number; note?: string }>({
    mutationFn: async ({
      taskId,
      projectId,
      progressBefore,
      progressAfter,
      note,
    }: {
      taskId: string;
      projectId: string;
      progressBefore: number;
      progressAfter: number;
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
        updates: { progress: progressAfter },
      });
    },
    onSuccess: () => {
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
      // Atomic reorder via Postgres RPC — single transaction
      const { error } = await supabase.rpc("reorder_siteplan_tasks", {
        updates: moves.map(({ id, sort_order, parent_id }) => ({
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
        const moveMap = new Map(moves.map((m) => [m.id, m]));
        qc.setQueryData(
          tasksKey(projectId),
          prev.map((t) => {
            const m = moveMap.get(t.id);
            return m ? { ...t, sort_order: m.sort_order, parent_id: m.parent_id } : t;
          })
        );
      }
      return { prev };
    },
    onError: (_err, { projectId }, context) => {
      if (context?.prev) {
        qc.setQueryData(tasksKey(projectId), context.prev);
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
  extends Omit<CreateTaskPayload, "project_id"> {
  _tempIndex: number;
  _parentIndex: number;
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

        // Build insert rows with resolved parent_id
        const rows = ready.map((t) => {
          const parentId =
            t._parentIndex >= 0
              ? indexToId.get(t._parentIndex) ?? null
              : null;
          // Strip internal fields
          const { _tempIndex, _parentIndex, ...rest } = t;
          void _tempIndex;
          void _parentIndex;
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

      return allInserted;
    },
    onSuccess: (data: SitePlanTask[]) => {
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
