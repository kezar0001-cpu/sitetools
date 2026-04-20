"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { fetchSiteVisitsForCompanySite, visitKeys } from "@/lib/workspace/client";
import { SiteVisit, VisitorType } from "@/lib/workspace/types";

interface UseSiteVisitsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

interface CreateVisitPayload {
  company_id: string;
  site_id: string;
  full_name: string;
  phone_number?: string | null;
  company_name: string;
  visitor_type: VisitorType;
  signed_in_at?: string | null;
  signed_out_at?: string | null;
}

interface UpdateVisitPayload {
  id: string;
  site_id: string;
  full_name: string;
  phone_number?: string | null;
  company_name: string;
  visitor_type: VisitorType;
  signed_in_at: string;
  signed_out_at?: string | null;
}

interface SignOutPayload {
  id: string;
  site_id: string;
}

interface DeleteVisitPayload {
  id: string;
  site_id: string;
}

/**
 * Hook for fetching site visits with "live" refetching.
 * Defaults to 30-second polling for real-time feel.
 */
export function useSiteVisits(
  companyId: string | null,
  siteId: string | null,
  options: UseSiteVisitsOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 30 * 1000, // 30 seconds for "live" feel
    staleTime = 10 * 1000, // 10 seconds since we poll
  } = options;

  const query = useQuery<SiteVisit[]>({
    queryKey: visitKeys.site(companyId, siteId),
    queryFn: async () => {
      if (!companyId || !siteId) return [];
      // TEST: Temporary error to verify ErrorBoundary - remove after testing
      throw new Error("Test error: Failed to load site visits from database");
      return fetchSiteVisitsForCompanySite(companyId, siteId);
    },
    enabled: enabled && !!companyId && !!siteId,
    refetchInterval,
    staleTime,
  });

  return {
    ...query,
    visits: query.data ?? [],
  };
}

/**
 * Hook for visit mutations with optimistic updates.
 * Returns mutation functions with automatic cache invalidation.
 */
export function useVisitMutations(
  companyId: string | null,
  siteId: string | null
) {
  const queryClient = useQueryClient();
  const queryKey = visitKeys.site(companyId, siteId);

  const getQueryKey = useCallback(() => queryKey, [queryKey]);

  // Create visit with optimistic update
  const createVisit = useMutation({
    mutationFn: async (payload: CreateVisitPayload) => {
      const { error } = await supabase.from("site_visits").insert({
        company_id: payload.company_id,
        site_id: payload.site_id,
        full_name: payload.full_name,
        phone_number: payload.phone_number ?? null,
        company_name: payload.company_name,
        visitor_type: payload.visitor_type,
        signed_in_at: payload.signed_in_at ?? new Date().toISOString(),
        signed_out_at: payload.signed_out_at ?? null,
      });

      if (error) throw error;
    },
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: getQueryKey() });

      // Snapshot previous value
      const previousVisits = queryClient.getQueryData<SiteVisit[]>(getQueryKey()) ?? [];

      // Optimistically add new visit
      const optimisticVisit: SiteVisit = {
        id: `temp-${Date.now()}`,
        company_id: payload.company_id,
        site_id: payload.site_id,
        project_id: null,
        full_name: payload.full_name,
        phone_number: payload.phone_number ?? null,
        company_name: payload.company_name,
        visitor_type: payload.visitor_type,
        signature: null,
        signed_in_at: payload.signed_in_at ?? new Date().toISOString(),
        signed_out_at: payload.signed_out_at ?? null,
        created_by_user_id: null,
        signed_in_by_user_id: null,
      };

      queryClient.setQueryData<SiteVisit[]>(getQueryKey(), (old) => {
        const visits = old ?? [];
        return [optimisticVisit, ...visits];
      });

      return { previousVisits };
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousVisits) {
        queryClient.setQueryData(getQueryKey(), context.previousVisits);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
  });

  // Update visit with optimistic update
  const updateVisit = useMutation({
    mutationFn: async (payload: UpdateVisitPayload) => {
      const { error } = await supabase
        .from("site_visits")
        .update({
          full_name: payload.full_name,
          phone_number: payload.phone_number ?? null,
          company_name: payload.company_name,
          visitor_type: payload.visitor_type,
          signed_in_at: payload.signed_in_at,
          signed_out_at: payload.signed_out_at ?? null,
        })
        .eq("id", payload.id)
        .eq("site_id", payload.site_id);

      if (error) throw error;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: getQueryKey() });
      const previousVisits = queryClient.getQueryData<SiteVisit[]>(getQueryKey()) ?? [];

      queryClient.setQueryData<SiteVisit[]>(getQueryKey(), (old) => {
        const visits = old ?? [];
        return visits.map((visit) =>
          visit.id === payload.id
            ? {
                ...visit,
                full_name: payload.full_name,
                phone_number: payload.phone_number ?? null,
                company_name: payload.company_name,
                visitor_type: payload.visitor_type,
                signed_in_at: payload.signed_in_at,
                signed_out_at: payload.signed_out_at ?? null,
              }
            : visit
        );
      });

      return { previousVisits };
    },
    onError: (err, payload, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(getQueryKey(), context.previousVisits);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
  });

  // Sign out visit with optimistic update
  const signOutVisit = useMutation({
    mutationFn: async (payload: SignOutPayload) => {
      const { error } = await supabase
        .from("site_visits")
        .update({ signed_out_at: new Date().toISOString() })
        .eq("id", payload.id)
        .eq("site_id", payload.site_id);

      if (error) throw error;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: getQueryKey() });
      const previousVisits = queryClient.getQueryData<SiteVisit[]>(getQueryKey()) ?? [];

      const now = new Date().toISOString();
      queryClient.setQueryData<SiteVisit[]>(getQueryKey(), (old) => {
        const visits = old ?? [];
        return visits.map((visit) =>
          visit.id === payload.id ? { ...visit, signed_out_at: now } : visit
        );
      });

      return { previousVisits };
    },
    onError: (err, payload, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(getQueryKey(), context.previousVisits);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
  });

  // Bulk sign out all visits for a site
  const bulkSignOut = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from("site_visits")
        .update({ signed_out_at: new Date().toISOString() })
        .eq("site_id", siteId)
        .is("signed_out_at", null);

      if (error) throw error;
    },
    onMutate: async (siteId) => {
      await queryClient.cancelQueries({ queryKey: getQueryKey() });
      const previousVisits = queryClient.getQueryData<SiteVisit[]>(getQueryKey()) ?? [];

      const now = new Date().toISOString();
      queryClient.setQueryData<SiteVisit[]>(getQueryKey(), (old) => {
        const visits = old ?? [];
        return visits.map((visit) =>
          visit.site_id === siteId && !visit.signed_out_at
            ? { ...visit, signed_out_at: now }
            : visit
        );
      });

      return { previousVisits };
    },
    onError: (err, payload, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(getQueryKey(), context.previousVisits);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
  });

  // Delete visit with optimistic update
  const deleteVisit = useMutation({
    mutationFn: async (payload: DeleteVisitPayload) => {
      const { error } = await supabase
        .from("site_visits")
        .delete()
        .eq("id", payload.id)
        .eq("site_id", payload.site_id);

      if (error) throw error;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: getQueryKey() });
      const previousVisits = queryClient.getQueryData<SiteVisit[]>(getQueryKey()) ?? [];

      queryClient.setQueryData<SiteVisit[]>(getQueryKey(), (old) => {
        const visits = old ?? [];
        return visits.filter((visit) => visit.id !== payload.id);
      });

      return { previousVisits };
    },
    onError: (err, payload, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(getQueryKey(), context.previousVisits);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() });
    },
  });

  return {
    createVisit,
    updateVisit,
    signOutVisit,
    bulkSignOut,
    deleteVisit,
  };
}

/**
 * Helper to invalidate visits cache.
 */
export function useInvalidateVisits() {
  const queryClient = useQueryClient();

  const invalidateVisits = useCallback(
    (companyId: string | null, siteId: string | null) => {
      if (!companyId || !siteId) return;
      queryClient.invalidateQueries({
        queryKey: visitKeys.site(companyId, siteId),
      });
    },
    [queryClient]
  );

  const invalidateAllVisits = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: visitKeys.all });
  }, [queryClient]);

  return { invalidateVisits, invalidateAllVisits };
}
