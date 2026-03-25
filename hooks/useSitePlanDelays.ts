"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sitePlanKeys } from "@/lib/queryKeys";
import type {
  SitePlanDelayLog,
  CreateDelayLogPayload,
} from "@/types/siteplan";

const delayLogsKey = sitePlanKeys.delayLogs;
const projectDelayLogsKey = sitePlanKeys.projectDelayLogs;

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
    staleTime: 30_000,
    gcTime: 300_000,
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
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

/** Create a delay log and optionally cascade date shifts via the server-side RPC. */
export function useCreateDelayLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      projectId,
    }: {
      payload: CreateDelayLogPayload;
      projectId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Single atomic RPC: inserts the log + cascades date shifts in one transaction.
      // Returns { log_id: string, affected_task_ids: string[] }
      const { data, error } = await supabase.rpc("log_siteplan_delay", {
        p_task_id: payload.task_id,
        p_delay_days: payload.delay_days,
        p_reason: payload.delay_reason,
        p_category: payload.delay_category,
        p_impacts_completion: payload.impacts_completion,
        p_logged_by: user!.id,
      });
      if (error) throw error;

      const result = data as { log_id: string; affected_task_ids: string[] };
      return result;
    },
    onSuccess: (data, { payload, projectId }) => {
      qc.invalidateQueries({ queryKey: delayLogsKey(payload.task_id) });
      qc.invalidateQueries({ queryKey: projectDelayLogsKey(projectId) });
      // Tasks may have shifted — refresh the task list
      qc.invalidateQueries({ queryKey: sitePlanKeys.tasks(projectId) });
      toast.success("Delay logged", { duration: 3000 });
      return data;
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
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
      toast.success("Delay updated", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

/** Delete a delay log, reversing any cascaded date shifts when impacts_completion=true. */
export function useDeleteDelayLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      impacts_completion,
    }: {
      id: string;
      taskId: string;
      projectId: string;
      impacts_completion: boolean;
    }) => {
      if (impacts_completion) {
        const confirmed = window.confirm(
          "This delay shifted task dates. Deleting it will reverse those date shifts for this task and all dependents. Continue?"
        );
        if (!confirmed) throw new Error("cancelled");

        // Reverse the cascade before the row is deleted
        const { error: reverseError } = await supabase.rpc(
          "reverse_siteplan_delay",
          { p_log_id: id }
        );
        if (reverseError) throw reverseError;
      }

      const { error } = await supabase
        .from("siteplan_delay_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { taskId, projectId }) => {
      qc.invalidateQueries({ queryKey: delayLogsKey(taskId) });
      qc.invalidateQueries({ queryKey: projectDelayLogsKey(projectId) });
      qc.invalidateQueries({ queryKey: sitePlanKeys.tasks(projectId) });
      toast.success("Delay removed", { duration: 3000 });
    },
    onError: (error) => {
      if ((error as Error).message === "cancelled") return;
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

