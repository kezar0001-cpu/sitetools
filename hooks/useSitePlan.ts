"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/lib/workspace/types";

const PROJECTS_KEY = ["siteplan", "projects"];

export function useCompanyId() {
  return useQuery<string>({
    queryKey: ["siteplan", "company-id"],
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

/** Fetch existing Buildstate projects for the user's company */
export function useSitePlanProjects() {
  const { data: companyId } = useCompanyId();

  return useQuery<Project[]>({
    queryKey: [...PROJECTS_KEY, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId!)
        .in("status", ["active", "on-hold"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

/** Fetch a single Buildstate project */
export function useSitePlanProject(projectId: string) {
  return useQuery<Project | null>({
    queryKey: ["siteplan", "project", projectId],
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
