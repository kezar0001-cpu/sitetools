"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadWorkspaceSummary } from "@/lib/workspace/client";
import { WorkspaceSummary } from "@/lib/workspace/types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setSummary(null);
      setLoading(false);
      if (requireAuth) router.replace(redirectToLogin);
      return;
    }

    try {
      const nextSummary = await loadWorkspaceSummary(user.id, user.email ?? null);
      setSummary(nextSummary);

      if (requireCompany && nextSummary.memberships.length === 0) {
        router.replace(redirectToOnboarding);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load workspace.";
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin, redirectToOnboarding, requireAuth, requireCompany, router]);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  return {
    loading,
    error,
    summary,
    refresh,
  };
}
