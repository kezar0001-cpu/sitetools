"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  fetchCompany,
  fetchProfile,
  updateCompany,
  updateProfile,
  companyKeys,
  profileKeys,
  workspaceKeys,
} from "@/lib/workspace/client";
import { Company, Profile } from "@/lib/workspace/types";

interface UseWorkspaceOptions {
  enabled?: boolean;
  staleTime?: number;
}

// ── Company Hook ─────────────────────────────────────────────────────────────

interface UpdateCompanyPayload {
  name: string;
}

/**
 * Hook for fetching company data with TanStack Query caching.
 */
export function useCompany(
  companyId: string | null,
  options: UseWorkspaceOptions = {}
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const query = useQuery<Company | null>({
    queryKey: companyKeys.detail(companyId),
    queryFn: async () => {
      if (!companyId) return null;
      return fetchCompany(companyId);
    },
    enabled: enabled && !!companyId,
    staleTime,
  });

  return {
    ...query,
    company: query.data ?? null,
  };
}

/**
 * Hook for updating company with optimistic updates.
 */
export function useUpdateCompany(companyId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = companyKeys.detail(companyId);

  return useMutation({
    mutationFn: async (payload: UpdateCompanyPayload) => {
      if (!companyId) throw new Error("Company ID is required");
      await updateCompany(companyId, { name: payload.name });
    },
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: workspaceKeys.summary });

      // Snapshot previous values
      const previousCompany = queryClient.getQueryData<Company | null>(queryKey);
      const previousWorkspace = queryClient.getQueryData<unknown>(workspaceKeys.summary);

      // Optimistically update company
      if (previousCompany) {
        queryClient.setQueryData<Company | null>(queryKey, {
          ...previousCompany,
          name: payload.name,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousCompany, previousWorkspace };
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousCompany) {
        queryClient.setQueryData(queryKey, context.previousCompany);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.summary });
    },
  });
}

// ── Profile Hook ─────────────────────────────────────────────────────────────

interface UpdateProfilePayload {
  full_name: string | null;
  phone_number: string | null;
}

/**
 * Hook for fetching profile data with TanStack Query caching.
 */
export function useProfile(
  userId: string | null,
  options: UseWorkspaceOptions = {}
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const query = useQuery<Profile | null>({
    queryKey: profileKeys.detail(userId),
    queryFn: async () => {
      if (!userId) return null;
      return fetchProfile(userId);
    },
    enabled: enabled && !!userId,
    staleTime,
  });

  return {
    ...query,
    profile: query.data ?? null,
  };
}

/**
 * Hook for updating profile with optimistic updates.
 */
export function useUpdateProfile(userId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = profileKeys.detail(userId);

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      if (!userId) throw new Error("User ID is required");
      await updateProfile(userId, {
        full_name: payload.full_name,
        phone_number: payload.phone_number,
      });
    },
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: workspaceKeys.summary });

      // Snapshot previous values
      const previousProfile = queryClient.getQueryData<Profile | null>(queryKey);
      const previousWorkspace = queryClient.getQueryData<unknown>(workspaceKeys.summary);

      // Optimistically update profile
      if (previousProfile) {
        queryClient.setQueryData<Profile | null>(queryKey, {
          ...previousProfile,
          full_name: payload.full_name,
          phone_number: payload.phone_number,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousProfile, previousWorkspace };
    },
    onError: (err, payload, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKey, context.previousProfile);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.summary });
    },
  });
}

// ── Cache Invalidation Helpers ───────────────────────────────────────────────

/**
 * Helper hook to invalidate workspace-related cache after mutations.
 */
export function useInvalidateWorkspace() {
  const queryClient = useQueryClient();

  const invalidateCompany = useCallback(
    (companyId: string | null) => {
      if (!companyId) return;
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
    [queryClient]
  );

  const invalidateProfile = useCallback(
    (userId: string | null) => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
    },
    [queryClient]
  );

  const invalidateWorkspaceSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: workspaceKeys.summary });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: companyKeys.all });
    queryClient.invalidateQueries({ queryKey: profileKeys.all });
    queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
  }, [queryClient]);

  return {
    invalidateCompany,
    invalidateProfile,
    invalidateWorkspaceSummary,
    invalidateAll,
  };
}
