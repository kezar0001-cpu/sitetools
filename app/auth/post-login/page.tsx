"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadWorkspaceSummary } from "@/lib/workspace/client";
import { parseProductIntent, resolveProductHome } from "@/lib/routing";

export default function PostLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Checking your account...");

  useEffect(() => {
    async function resolveNextRoute() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setMessage("Loading your workspace...");

      const summary = await loadWorkspaceSummary(user.id, user.email ?? null);
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

    resolveNextRoute().catch(() => {
      router.replace("/login");
    });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  );
}
