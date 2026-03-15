"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  SitePlanProject,
  CreateProjectPayload,
} from "@/types/siteplan";

const PROJECTS_KEY = ["siteplan", "projects"];

async function getOrgId(): Promise<string> {
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
}

export function useSitePlanProjects() {
  return useQuery<SitePlanProject[]>({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSitePlanProject(projectId: string) {
  return useQuery<SitePlanProject>({
    queryKey: ["siteplan", "project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siteplan_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const orgId = await getOrgId();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("siteplan_projects")
        .insert({
          ...payload,
          org_id: orgId,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SitePlanProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("siteplan_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
