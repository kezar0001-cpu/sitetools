"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { companyKeys } from "@/lib/queryKeys";

export interface CompanyMember {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
}

export function useCompanyMembers(companyId: string | null) {
  return useQuery<CompanyMember[]>({
    queryKey: companyKeys.members(companyId),
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_memberships")
        .select("user_id, profiles(id, full_name, email)")
        .eq("company_id", companyId);

      if (error) throw error;

      return (data ?? []).map((m: Record<string, unknown>) => {
        const profile = m.profiles as Record<string, unknown> | null;
        return {
          id: (profile?.id as string) ?? (m.user_id as string),
          name: (profile?.full_name as string) ?? (profile?.email as string) ?? "Unknown",
          email: (profile?.email as string) ?? null,
          avatar_url: null,
        };
      });
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
