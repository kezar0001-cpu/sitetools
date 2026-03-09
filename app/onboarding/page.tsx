"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptCompanyInvitation, createCompany } from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

function OnboardingLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
    </div>
  );
}

function OnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, error, summary } = useWorkspace({ requireAuth: true, requireCompany: false });

  const [companyName, setCompanyName] = useState("");
  const [inviteValue, setInviteValue] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token") ?? searchParams.get("code");
    if (token && !inviteValue) {
      setInviteValue(token);
    }
  }, [inviteValue, searchParams]);

  useEffect(() => {
    if (summary && summary.memberships.length > 0) {
      router.replace("/dashboard/site-sign-in");
    }
  }, [router, summary]);

  async function onCreateCompany(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);

    if (!companyName.trim()) {
      setFormError("Company name is required.");
      return;
    }

    setCreateLoading(true);
    try {
      await createCompany(companyName.trim());
      router.replace("/dashboard/site-sign-in");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to create company.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function onJoinCompany(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);

    if (!inviteValue.trim()) {
      setFormError("Invitation token or code is required.");
      return;
    }

    setJoinLoading(true);
    try {
      const result = await acceptCompanyInvitation(inviteValue.trim());
      if (!result.success) {
        setFormError(result.message ?? "Unable to join company.");
        return;
      }
      setInfo("Invitation accepted. Redirecting to your workspace...");
      router.replace("/dashboard/site-sign-in");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to join company.");
    } finally {
      setJoinLoading(false);
    }
  }

  if (loading) {
    return <OnboardingLoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-2xl p-6 w-full max-w-lg">
          <h1 className="text-lg font-bold text-red-700">Unable to load onboarding</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Set up your SiteSign workspace</h1>
          <p className="mt-2 text-slate-600 font-medium">
            Create your company workspace (or join one) to start SiteSign with your team.
          </p>
        </div>

        {(formError || info) && (
          <div className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold border ${formError ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {formError ?? info}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">Create a Company for SiteSign</h2>
            <p className="text-sm text-slate-600 mt-1">You will be assigned as the Owner for this workspace.</p>
            <form className="mt-5 space-y-4" onSubmit={onCreateCompany}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">Company Name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Example Civil Pty Ltd"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl px-4 py-3 text-sm"
              >
                {createLoading ? "Creating workspace..." : "Create SiteSign Workspace"}
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">Join an Existing SiteSign Workspace</h2>
            <p className="text-sm text-slate-600 mt-1">Use the invitation token or short invite code sent by your company admin.</p>
            <form className="mt-5 space-y-4" onSubmit={onJoinCompany}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">Invitation Token or Code</label>
                <input
                  value={inviteValue}
                  onChange={(e) => setInviteValue(e.target.value)}
                  placeholder="e.g. 8F4E22A1 or long token"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={joinLoading}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
              >
                {joinLoading ? "Joining workspace..." : "Join SiteSign Workspace"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingFallback />}>
      <OnboardingClient />
    </Suspense>
  );
}
