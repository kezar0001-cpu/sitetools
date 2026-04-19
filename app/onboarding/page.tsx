"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptCompanyInvitation, createCompany, inspectCompanyInvitation } from "@/lib/workspace/client";
import { resolveInvitationAcceptanceError } from "@/lib/workspace/invitations";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { parseProductIntent, resolveProductHome } from "@/lib/routing";
import { supabase } from "@/lib/supabase";

function OnboardingLoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-amber-500 animate-spin" />
    </div>
  );
}

function SuccessView({
  type,
  companyName,
  productHome,
  intent,
}: {
  type: "create" | "join";
  companyName: string;
  productHome: string;
  intent: string | null;
}) {
  const intentLabel =
    intent === "siteplan" ? "Site Planner" : intent === "sitesign" ? "Site Sign In" : "Dashboard";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-zoom-in opacity-0">
        <div className="relative mb-12 flex justify-center">
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full scale-150 -z-10" />
          
          <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl shadow-amber-200/50 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <svg 
                className="w-10 h-10 text-white fill-none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Workspace Ready!
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            {type === "create"
              ? "Your premium workspace has been initialized and is ready for your team."
              : "You've successfully joined the workspace. Your access is now active."}
          </p>
        </div>

        <div className="mt-10 bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 text-center">
          <div className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
            Active Workspace
          </div>
          <div className="text-2xl font-black text-slate-900 break-words">
            {companyName}
          </div>
        </div>

        <div className="mt-10">
          <a
            href={productHome}
            className="group relative flex items-center justify-center w-full bg-slate-900 hover:bg-black text-white font-bold rounded-2xl px-8 py-5 text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-slate-200 overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-3">
              Continue to {intentLabel}
              <svg 
                className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </a>
          <p className="mt-6 text-center text-slate-400 text-sm font-medium">
            Redirecting automatically in a moment...
          </p>
        </div>
      </div>
    </div>
  );
}

function OnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, error, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: false });
  const intent = parseProductIntent(searchParams.get("intent"));
  const productHome = resolveProductHome(intent);

  const [companyName, setCompanyName] = useState("");
  const [inviteValue, setInviteValue] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ type: "create" | "join"; name: string } | null>(null);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token") ?? searchParams.get("code");
    if (token && !inviteValue) {
      setInviteValue(token);
    }
  }, [inviteValue, searchParams]);

  useEffect(() => {
    if (summary && summary.memberships.length > 0 && !success && !onboardingSubmitted) {
      router.replace(productHome);
    }
  }, [onboardingSubmitted, productHome, router, summary, success]);

  // Handle auto-redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.replace(productHome);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, productHome, router]);

  async function onCreateCompany(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);

    if (!companyName.trim()) {
      setFormError("Company name is required.");
      setOnboardingSubmitted(false);
      return;
    }

    setOnboardingSubmitted(true);

    setCreateLoading(true);
    try {
      await createCompany(companyName.trim());
      await refresh();
      setSuccess({ type: "create", name: companyName.trim() });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to create company.");
      setOnboardingSubmitted(false);
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
      setOnboardingSubmitted(false);
      return;
    }

    setOnboardingSubmitted(true);

    setJoinLoading(true);
    try {
      const result = await acceptCompanyInvitation(inviteValue.trim());
      if (!result.success) {
        const invitation = await inspectCompanyInvitation(inviteValue.trim());
        setFormError(resolveInvitationAcceptanceError(result, invitation));
        setOnboardingSubmitted(false);
        return;
      }
      
      let name = "Your Workspace";
      if (result.company_id) {
        const { data } = await supabase
          .from("companies")
          .select("name")
          .eq("id", result.company_id)
          .single();
        if (data?.name) name = data.name;
      }
      
      await refresh();
      setSuccess({ type: "join", name });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to join company.");
      setOnboardingSubmitted(false);
    } finally {
      setJoinLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <SuccessView
          type={success.type}
          companyName={success.name}
          productHome={productHome}
          intent={intent}
        />
      </div>
    );
  }

  if (loading) {
    return <OnboardingLoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-100 rounded-3xl p-8 w-full max-w-lg shadow-xl shadow-red-100/20">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900">Workspace Error</h1>
          <p className="mt-2 text-slate-500 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Set up your workspace</h1>
          <p className="mt-2 text-slate-600 font-medium">
            Choose how you will use Buildstate: as a company owner setting up the workspace, or as a team member joining an existing workspace.
          </p>
        </div>

        {(formError || info) && (
          <div className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold border ${formError ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {formError ?? info}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                Owner / Admin
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Create a workspace</h2>
            <p className="text-sm text-slate-600 mt-1">For company owners and directors setting up their own Buildstate account.</p>
            <form className="mt-5 space-y-4" onSubmit={onCreateCompany}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">Company name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Horizon Construction Pty Ltd"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={createLoading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl px-4 py-3 text-sm"
              >
                {createLoading ? "Creating workspace..." : "Create your workspace"}
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                Team Member
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Join an existing workspace</h2>
            <p className="text-sm text-slate-600 mt-1">For team members who have received an invite from their company admin.</p>
            <form className="mt-5 space-y-4" onSubmit={onJoinCompany}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">Invitation code</label>
                <input
                  value={inviteValue}
                  onChange={(e) => setInviteValue(e.target.value)}
                  placeholder="Paste the invite code from your admin"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                disabled={joinLoading}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
              >
                {joinLoading ? "Joining workspace..." : "Join workspace"}
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
