"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sitePlanKeys } from "@/lib/queryKeys";
import type { SitePlanTask } from "@/types/siteplan";

// ─── Diff helpers ────────────────────────────────────────────────────────────

export interface BaselineDiffChange {
  task: SitePlanTask;
  /** only set when a date field changed */
  oldStart?: string;
  oldEnd?: string;
  /** only set when progress changed */
  oldProgress?: number;
}

export interface BaselineDiff {
  added: SitePlanTask[];
  deleted: SitePlanTask[];
  dateChanges: BaselineDiffChange[];
  progressChanges: BaselineDiffChange[];
}

export function computeBaselineDiff(
  snapshot: SitePlanTask[],
  current: SitePlanTask[]
): BaselineDiff {
  const snapshotById = new Map(snapshot.map((t) => [t.id, t]));
  const currentById = new Map(current.map((t) => [t.id, t]));

  const added = current.filter((t) => !snapshotById.has(t.id));
  const deleted = snapshot.filter((t) => !currentById.has(t.id));

  const dateChanges: BaselineDiffChange[] = [];
  const progressChanges: BaselineDiffChange[] = [];

  for (const curr of current) {
    const snap = snapshotById.get(curr.id);
    if (!snap) continue;
    if (snap.start_date !== curr.start_date || snap.end_date !== curr.end_date) {
      dateChanges.push({ task: curr, oldStart: snap.start_date, oldEnd: snap.end_date });
    }
    if (snap.progress !== curr.progress) {
      progressChanges.push({ task: curr, oldProgress: snap.progress });
    }
  }

  return { added, deleted, dateChanges, progressChanges };
}

export interface Baseline {
  id: string;
  project_id: string;
  name: string;
  snapshot: SitePlanTask[];
  created_by: string;
  created_at: string;
}

const baselinesKey = sitePlanKeys.baselines;

export function useSitePlanBaselines(projectId: string) {
  return useQuery<Baseline[]>({
    queryKey: baselinesKey(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_baselines")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Baseline[];
    },
    enabled: !!projectId,
  });
}

export function useSaveBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      tasks,
    }: {
      projectId: string;
      name: string;
      tasks: SitePlanTask[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("siteplan_baselines")
        .insert({
          project_id: projectId,
          name,
          snapshot: tasks,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Baseline;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: baselinesKey(data.project_id),
      });
      toast.success("Baseline saved", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}

export type RestoreMode = "full" | "dates_only";

export function useRestoreBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      snapshot,
      currentTasks,
      mode,
    }: {
      projectId: string;
      snapshot: SitePlanTask[];
      currentTasks: SitePlanTask[];
      mode: RestoreMode;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Save current state as a backup baseline before overwriting
      const backupName = `Pre-restore backup ${new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const { error: backupError } = await supabase
        .from("siteplan_baselines")
        .insert({
          project_id: projectId,
          name: backupName,
          snapshot: currentTasks,
          created_by: user!.id,
        });
      if (backupError) throw backupError;

      // 2. Build updates — only tasks present in both snapshot and current
      const currentIds = new Set(currentTasks.map((t) => t.id));
      const updates = snapshot
        .filter((t) => currentIds.has(t.id))
        .map((t) => {
          if (mode === "dates_only") {
            return {
              id: t.id,
              start_date: t.start_date,
              end_date: t.end_date,
              duration_days: t.duration_days,
            };
          }
          return {
            id: t.id,
            start_date: t.start_date,
            end_date: t.end_date,
            duration_days: t.duration_days,
            progress: t.progress,
            status: t.status,
            actual_start: t.actual_start,
            actual_end: t.actual_end,
          };
        });

      if (updates.length === 0) return;

      const { error } = await supabase
        .from("siteplan_tasks")
        .upsert(updates, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: sitePlanKeys.baselines(projectId) });
      qc.invalidateQueries({ queryKey: sitePlanKeys.tasks(projectId) });
      toast.success("Restored from baseline — backup saved", { duration: 4000 });
    },
    onError: () => {
      toast.error("Restore failed — please retry", { duration: Infinity });
    },
  });
}

export function useDeleteBaseline() {
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
        .from("siteplan_baselines")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: baselinesKey(projectId) });
      toast.success("Baseline deleted", { duration: 3000 });
    },
    onError: () => {
      toast.error("Failed to save — please retry", { duration: Infinity });
    },
  });
}
