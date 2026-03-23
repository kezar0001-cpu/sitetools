"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sitePlanKeys } from "@/lib/queryKeys";
import type { SitePlanTask } from "@/types/siteplan";

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
