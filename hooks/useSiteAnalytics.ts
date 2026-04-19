import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSiteAnalytics,
  siteAnalyticsKeys,
  SiteAnalyticsData,
} from "@/lib/workspace/siteAnalytics";

/**
 * Hook to fetch site analytics data with caching
 * - Stale time: 5 minutes (analytics don't need to be real-time)
 * - Cache time: 10 minutes
 */
export function useSiteAnalytics(siteId: string | null) {
  return useQuery<SiteAnalyticsData>({
    queryKey: siteAnalyticsKeys.site(siteId),
    queryFn: async () => {
      if (!siteId) {
        throw new Error("Site ID is required");
      }
      return fetchSiteAnalytics(siteId);
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to prefetch site analytics (useful for hover states)
 */
export function usePrefetchSiteAnalytics() {
  const queryClient = useQueryClient();

  return {
    prefetch: (siteId: string) => {
      queryClient.prefetchQuery({
        queryKey: siteAnalyticsKeys.site(siteId),
        queryFn: () => fetchSiteAnalytics(siteId),
        staleTime: 5 * 60 * 1000,
      });
    },
    invalidate: (siteId: string | null) => {
      if (siteId) {
        queryClient.invalidateQueries({
          queryKey: siteAnalyticsKeys.site(siteId),
        });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: siteAnalyticsKeys.all,
      });
    },
  };
}
