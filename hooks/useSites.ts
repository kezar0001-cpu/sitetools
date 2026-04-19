"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchCompanySites, fetchProjectSites, siteKeys } from "@/lib/workspace/client";
import { Site } from "@/lib/workspace/types";

interface UseSitesOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook for fetching sites by company with TanStack Query caching.
 * Includes prefetching helper for hover interactions.
 */
export function useCompanySites(
  companyId: string | null,
  options: UseSitesOptions = {}
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;
  const queryClient = useQueryClient();

  const query = useQuery<Site[]>({
    queryKey: siteKeys.company(companyId),
    queryFn: async () => {
      if (!companyId) return [];
      return fetchCompanySites(companyId);
    },
    enabled: enabled && !!companyId,
    staleTime,
  });

  /**
   * Prefetch sites for a company on hover.
   * Call this in onMouseEnter handlers for instant navigation.
   */
  const prefetchSites = useCallback(
    (prefetchCompanyId: string) => {
      if (!prefetchCompanyId) return;
      
      queryClient.prefetchQuery({
        queryKey: siteKeys.company(prefetchCompanyId),
        queryFn: () => fetchCompanySites(prefetchCompanyId),
        staleTime,
      });
    },
    [queryClient, staleTime]
  );

  return {
    ...query,
    sites: query.data ?? [],
    prefetchSites,
  };
}

/**
 * Hook for fetching sites by project with TanStack Query caching.
 */
export function useProjectSites(
  projectId: string | null,
  options: UseSitesOptions = {}
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const query = useQuery<Site[]>({
    queryKey: projectId ? siteKeys.project(projectId) : siteKeys.all,
    queryFn: async () => {
      if (!projectId) return [];
      return fetchProjectSites(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime,
  });

  return {
    ...query,
    sites: query.data ?? [],
  };
}

/**
 * Helper hook to invalidate sites cache after mutations.
 */
export function useInvalidateSites() {
  const queryClient = useQueryClient();

  const invalidateCompanySites = useCallback(
    (companyId: string | null) => {
      if (!companyId) return;
      queryClient.invalidateQueries({ queryKey: siteKeys.company(companyId) });
    },
    [queryClient]
  );

  const invalidateProjectSites = useCallback(
    (projectId: string) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.project(projectId) });
    },
    [queryClient]
  );

  const invalidateAllSites = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: siteKeys.all });
  }, [queryClient]);

  return {
    invalidateCompanySites,
    invalidateProjectSites,
    invalidateAllSites,
  };
}
