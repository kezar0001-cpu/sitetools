"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadWorkspaceSummary } from "@/lib/workspace/client";
import { cacheWorkspaceSummary, clearWorkspaceSummaryCache, getAnyCachedWorkspaceSummary } from "@/lib/workspace/summaryCache";
import { WorkspaceSummary } from "@/lib/workspace/types";

function seedFromCache(): WorkspaceSummary | null {
  try {
    // supabase GoTrueClient exposes the in-memory user synchronously
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (supabase as any).auth?.currentUser?.id ?? null;
    if (!userId) return null;
    return getAnyCachedWorkspaceSummary(userId);
  } catch {
    return null;
  }
}

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("load failed") || msg.includes("failed to fetch") || msg.includes("networkerror");
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 800): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isNetworkError(err) || attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  // Unreachable, but satisfies TypeScript
  return fn();
}

interface UseWorkspaceOptions {
  requireAuth?: boolean;
  requireCompany?: boolean;
  redirectToLogin?: string;
  redirectToOnboarding?: string;
}

export function useWorkspace(options: UseWorkspaceOptions = {}) {
  const {
    requireAuth = true,
    requireCompany = false,
    redirectToLogin = "/login",
    redirectToOnboarding = "/onboarding",
  } = options;

  const router = useRouter();
  const [summary, setSummary] = useState<WorkspaceSummary | null>(seedFromCache);
  const [loading, setLoading] = useState(() => seedFromCache() === null);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef(summary);
  useEffect(() => { summaryRef.current = summary; }, [summary]);

  const refresh = useCallback(async () => {
    // Only show a loading spinner if we have no cached data to display yet.
    if (!summaryRef.current) setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = await (supabase.auth.getUser() as Promise<any>);

    if (userError) {
      // If it's a common "not signed in" error, treat it as no user rather than a failure
      const isMissingSession = 
        userError.message.toLowerCase().includes("session") || 
        userError.message.toLowerCase().includes("not found") ||
        userError.status === 401 ||
        userError.status === 403;

      if (isMissingSession) {
        setSummary(null);
        clearWorkspaceSummaryCache();
        setLoading(false);
        if (requireAuth) router.replace(redirectToLogin);
        return;
      }

      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setSummary(null);
      clearWorkspaceSummaryCache();
      setLoading(false);
      if (requireAuth) router.replace(redirectToLogin);
      return;
    }

    try {
      const nextSummary = await withRetry(() => loadWorkspaceSummary(user.id, user.email ?? null));
      setSummary(nextSummary);
      cacheWorkspaceSummary(nextSummary);

      if (requireCompany && nextSummary.memberships.length === 0) {
        router.replace(redirectToOnboarding);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load workspace.";
      setError(message);
      setSummary(null);
      clearWorkspaceSummaryCache();
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin, redirectToOnboarding, requireAuth, requireCompany, router]);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSummary(null);
        setError(null);
        clearWorkspaceSummaryCache();
        setLoading(false);
        if (requireAuth) router.replace(redirectToLogin);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // Only refresh for definitive state changes that might affect workspace
        refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh, requireAuth, redirectToLogin, router]);

  return {
    loading,
    error,
    summary,
    refresh,
  };
}
