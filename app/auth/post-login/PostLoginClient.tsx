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
    const intent = parseProductIntent(searchParams.get("intent"));
    const retryParams = new URLSearchParams();
    if (intent) retryParams.set("intent", intent);
    const retryHref = retryParams.size > 0 ? `/auth/post-login?${retryParams.toString()}` : "/auth/post-login";

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-red-900/50 rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
          <p className="text-base font-bold text-red-400">Unable to load your workspace</p>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <div className="mt-5 flex flex-col gap-2 items-center">
            <a href={retryHref} className="inline-block text-sm font-semibold text-amber-400 hover:underline">
              Try again
            </a>
            <a href="/login" className="inline-block text-sm font-semibold text-zinc-500 hover:text-zinc-300 hover:underline">
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
        <div className="w-2 h-2 rounded-sm bg-amber-400 mx-auto mb-6" />
        <p className="text-base font-bold text-zinc-100">{message}</p>
        <p className="mt-2 text-sm text-zinc-500">Taking you straight to your dashboard…</p>
        <div className="mt-6 h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-amber-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
