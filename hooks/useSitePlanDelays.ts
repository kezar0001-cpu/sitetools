"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  SitePlanDelayLog,
  CreateDelayLogPayload,
  SitePlanTask,
} from "@/types/siteplan";

function delayLogsKey(taskId: string) {
  return ["siteplan", "delay-logs", taskId];
}

function projectDelayLogsKey(projectId: string) {
  return ["siteplan", "delay-logs-project", projectId];
}

// ─── Queries ────────────────────────────────────────────────

/** Fetch delay logs for a single task */
export function useDelayLogs(taskId: string | null) {
  return useQuery<SitePlanDelayLog[]>({
    queryKey: delayLogsKey(taskId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_delay_logs")
        .select("*")
        .eq("task_id", taskId!)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!taskId,
  });
}

/** Fetch all delay logs for a project (join through tasks) */
export function useProjectDelayLogs(projectId: string) {
  return useQuery<SitePlanDelayLog[]>({
    queryKey: projectDelayLogsKey(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_delay_logs")
        .select("*, siteplan_tasks!inner(project_id)")
        .eq("siteplan_tasks.project_id", projectId)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      // Flatten — the join returns nested but we only need the delay log fields
      return (data ?? []).map((d: Record<string, unknown>) => {
        const { siteplan_tasks: _, ...log } = d;
        return log as unknown as SitePlanDelayLog;
      });
    },
    enabled: !!projectId,
  });
}

// ─── Mutations ──────────────────────────────────────────────

/** Create a delay log and optionally cascade date shifts */
export function useCreateDelayLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      projectId,
      allTasks,
    }: {
      payload: CreateDelayLogPayload;
      projectId: string;
      allTasks: SitePlanTask[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Insert the delay log
      const { data: log, error } = await supabase
        .from("siteplan_delay_logs")
        .insert({
          task_id: payload.task_id,
          delay_days: payload.delay_days,
          delay_reason: payload.delay_reason,
          delay_category: payload.delay_category,
          impacts_completion: payload.impacts_completion,
          logged_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // If impacts completion, shift this task's end date and cascade to dependents
      if (payload.impacts_completion) {
        await cascadeDateShift(
          payload.task_id,
          payload.delay_days,
          projectId,
          allTasks
        );
      }

      return log as SitePlanDelayLog;
    },
    onSuccess: (_data, { payload, projectId }) => {
      qc.invalidateQueries({ queryKey: delayLogsKey(payload.task_id) });
      qc.invalidateQueries({ queryKey: projectDelayLogsKey(projectId) });
      // Also invalidate tasks since dates may have shifted
      qc.invalidateQueries({ queryKey: ["siteplan", "tasks", projectId] });
    },
  });
}

/** Update an existing delay log */
export function useUpdateDelayLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      taskId: string;
      projectId: string;
      updates: Partial<
        Pick<
          SitePlanDelayLog,
          "delay_days" | "delay_reason" | "delay_category" | "impacts_completion"
        >
      >;
    }) => {
      const { data, error } = await supabase
        .from("siteplan_delay_logs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SitePlanDelayLog;
    },
    onSuccess: (_data, { taskId, projectId }) => {
      qc.invalidateQueries({ queryKey: delayLogsKey(taskId) });
      qc.invalidateQueries({ queryKey: projectDelayLogsKey(projectId) });
    },
  });
}

/** Delete a delay log */
export function useDeleteDelayLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      taskId: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from("siteplan_delay_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { taskId, projectId }) => {
      qc.invalidateQueries({ queryKey: delayLogsKey(taskId) });
      qc.invalidateQueries({ queryKey: projectDelayLogsKey(projectId) });
      qc.invalidateQueries({ queryKey: ["siteplan", "tasks", projectId] });
    },
  });
}

// ─── Cascade logic ──────────────────────────────────────────

/**
 * Shift a task's end date by delayDays, then cascade to all successor
 * tasks that depend on it (same logic as Procore scheduling).
 */
async function cascadeDateShift(
  taskId: string,
  delayDays: number,
  projectId: string,
  allTasks: SitePlanTask[]
) {
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) return;

  // Shift this task's end date
  const newEnd = addCalendarDays(task.end_date, delayDays);
  await supabase
    .from("siteplan_tasks")
    .update({ end_date: newEnd, status: "delayed" })
    .eq("id", taskId);

  // Find successor tasks (tasks that list this task's wbs_code in predecessors)
  const successors = allTasks.filter((t) => {
    if (!t.predecessors) return false;
    const preds = t.predecessors.split(",").map((p) => p.trim());
    return preds.some(
      (p) => p === task.wbs_code || p.startsWith(task.wbs_code + "FS")
    );
  });

  // Cascade: shift each successor's start and end dates
  for (const succ of successors) {
    const newStart = addCalendarDays(succ.start_date, delayDays);
    const newSuccEnd = addCalendarDays(succ.end_date, delayDays);
    await supabase
      .from("siteplan_tasks")
      .update({ start_date: newStart, end_date: newSuccEnd })
      .eq("id", succ.id);

    // Recursively cascade to successors of successors
    await cascadeDateShift(succ.id, delayDays, projectId, allTasks);
  }
}

function addCalendarDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
