"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { acceptCompanyInvitation } from "@/lib/workspace/client";
import { supabase } from "@/lib/supabase";

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function accept() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const result = await acceptCompanyInvitation(token);
        if (!result.success) {
          setError(result.message ?? "Could not accept invitation.");
          return;
        }
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not accept invitation.");
      } finally {
        setLoading(false);
      }
    }

    accept().catch(() => {
      setError("Could not accept invitation.");
      setLoading(false);
    });
  }, [router, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-lg shadow-sm">
        {loading && (
          <>
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin mx-auto" />
            <p className="text-center mt-4 text-sm text-slate-600 font-medium">Accepting invitation...</p>
          </>
        )}

        {!loading && error && (
          <>
            <h1 className="text-xl font-bold text-red-700">Invitation could not be accepted</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              onClick={() => router.push("/onboarding")}
              className="mt-6 w-full bg-slate-900 hover:bg-black text-white font-bold rounded-xl px-4 py-3 text-sm"
            >
              Go to Onboarding
            </button>
          </>
        )}

        {!loading && success && (
          <>
            <h1 className="text-xl font-bold text-emerald-700">Invitation accepted</h1>
            <p className="mt-2 text-sm text-slate-600">You now have access to this company workspace.</p>
            <button
              onClick={() => router.push("/dashboard/site-sign-in")}
              className="mt-6 w-full bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
            >
              Open Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
