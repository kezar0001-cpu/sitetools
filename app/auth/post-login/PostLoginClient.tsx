"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadWorkspaceSummary } from "@/lib/workspace/client";
import { cacheWorkspaceSummary } from "@/lib/workspace/summaryCache";
import { parseProductIntent, resolveProductHome } from "@/lib/routing";

export function PostLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Checking your account...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveNextRoute() {
      // Use getSession() to check auth from local storage — no network call needed
      // right after login, making this resilient to transient server/network issues.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const { user } = session;

      setMessage("Loading your workspace...");

      const summary = await loadWorkspaceSummary(user.id, user.email ?? null);
      cacheWorkspaceSummary(summary);
      const intent = parseProductIntent(searchParams.get("intent"));
      const productHome = resolveProductHome(intent);

      if (summary.memberships.length === 0) {
        const onboardingParams = new URLSearchParams();
        if (intent) onboardingParams.set("intent", intent);
        const onboardingRoute = onboardingParams.size > 0
          ? `/onboarding?${onboardingParams.toString()}`
          : "/onboarding";

        router.replace(onboardingRoute);
        return;
      }

      router.replace(productHome);
    }

    resolveNextRoute().catch((err) => {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
          <p className="text-base font-semibold text-red-700">Unable to load your workspace</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <a href="/login" className="mt-4 inline-block text-sm font-semibold text-amber-600 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
        <p className="text-base font-semibold text-slate-800">{message}</p>
        <p className="mt-2 text-sm text-slate-500">Taking you straight to your dashboard…</p>
      </div>
    </div>
  );
}
