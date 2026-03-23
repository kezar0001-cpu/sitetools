"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/lib/workspace/types";
import { sitePlanKeys } from "@/lib/queryKeys";

export function useCompanyId() {
  return useQuery<string>({
    queryKey: sitePlanKeys.companyId(),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from("company_memberships")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!data) throw new Error("No organisation found");
      return data.company_id;
    },
  });
}

/** Project with pre-aggregated task stats from the RPC */
export interface ProjectWithStats extends Project {
  task_count: number;
  avg_progress: number;
  has_delayed: boolean;
}

/** Fetch projects with task stats in a single RPC call (no N+1) */
export function useSitePlanProjects() {
  const { data: companyId } = useCompanyId();

  return useQuery<ProjectWithStats[]>({
    queryKey: sitePlanKeys.projectList(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_siteplan_projects_with_stats",
        { p_company_id: companyId! }
      );
      if (error) {
        // Fallback: RPC doesn't exist yet — use plain query
        if (error.code === "42883") {
          const { data: plain, error: plainErr } = await supabase
            .from("projects")
            .select("*")
            .eq("company_id", companyId!)
            .in("status", ["active", "on-hold"])
            .order("created_at", { ascending: false });
          if (plainErr) throw plainErr;
          return (plain ?? []).map((p: Project) => ({
            ...p,
            task_count: 0,
            avg_progress: 0,
            has_delayed: false,
          }));
        }
        throw error;
      }
      return (data ?? []) as ProjectWithStats[];
    },
    enabled: !!companyId,
  });
}

/** Fetch a single Buildstate project */
export function useSitePlanProject(projectId: string) {
  return useQuery<Project | null>({
    queryKey: sitePlanKeys.project(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
