"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  SitePlanTask,
  SitePlanProgressLog,
  CreateTaskPayload,
  UpdateTaskPayload,
} from "@/types/siteplan";
import { computeTaskStatus } from "@/types/siteplan";

function tasksKey(projectId: string) {
  return ["siteplan", "tasks", projectId];
}

function progressLogKey(taskId: string) {
  return ["siteplan", "progress-log", taskId];
}

// ─── Queries ────────────────────────────────────────────────

export function useSitePlanTasks(projectId: string) {
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
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
      supabase.removeChannel(channel);
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
  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const { data, error } = await supabase
        .from("siteplan_tasks")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SitePlanTask;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: tasksKey(data.project_id) });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
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
    onError: (_err, { projectId }, context) => {
      if (context?.prev) {
        qc.setQueryData(tasksKey(projectId), context.prev);
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId) });
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  const updateTask = useUpdateTask();

  return useMutation({
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
    onSettled: (_data, _err, { taskId }) => {
      qc.invalidateQueries({ queryKey: progressLogKey(taskId) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
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
    },
  });
}

export function useBulkCreateTasks() {
  const qc = useQueryClient();
  return useMutation({
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
    },
  });
}
