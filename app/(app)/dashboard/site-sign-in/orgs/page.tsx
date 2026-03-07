"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NoOrgDashboard } from "../components/NoOrgDashboard";

interface Organisation { id: string; name: string; created_at: string; is_public?: boolean; description?: string | null; join_code?: string | null; join_code_expires?: string | null; created_by?: string | null; }
interface OrgMember { id: string; org_id: string; user_id: string; role: "admin" | "editor" | "viewer"; site_id: string | null; created_at: string; }

export default function OrgsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [org, setOrg] = useState<Organisation | null>(null);
  const [member, setMember] = useState<OrgMember | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [orgFetched, setOrgFetched] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
      } else {
        setOrgFetched(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
      } else {
        setUserId(null);
        setUserEmail("");
        setOrg(null);
        setMember(null);
        setDbError(null);
        setOrgFetched(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load org membership once authenticated
  useEffect(() => {
    if (!userId) return;
    setLoadingOrg(true);
    setDbError(null);
    supabase.from("org_members").select("*").eq("user_id", userId).limit(1).maybeSingle()
      .then(async ({ data: mem, error: memErr }) => {
        if (memErr) {
          setDbError(`org_members error ${memErr.code}: ${memErr.message}`);
          setLoadingOrg(false);
          setOrgFetched(true);
          return;
        }
        if (mem) {
          setMember(mem as OrgMember);
          const { data: orgData, error: orgErr } = await supabase
            .from("organisations").select("*").eq("id", (mem as OrgMember).org_id).single();
          if (orgErr) {
            setDbError(`organisations error ${orgErr.code}: ${orgErr.message}`);
            setLoadingOrg(false);
            setOrgFetched(true);
            return;
          }
          if (orgData) setOrg(orgData as Organisation);
        }
        setLoadingOrg(false);
        setOrgFetched(true);
      });
  }, [userId]);

  // Redirect to main admin if user has an org
  useEffect(() => {
    if (authed && orgFetched && !loadingOrg && !dbError && org && member) {
      router.replace("/admin");
    }
  }, [authed, orgFetched, loadingOrg, dbError, org, member, router]);

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600 text-white rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">Organization Setup</h1>
                <p className="text-xs font-medium text-yellow-800">Create or join an organization</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="text-yellow-800 hover:text-yellow-900 font-medium text-sm"
              >
                ← Back to Admin
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow border border-gray-200 p-8 space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-900 text-center">Authentication Required</h2>
            <p className="text-sm text-gray-600 text-center">Please sign in to manage organizations.</p>
            <button
              onClick={() => router.push("/admin")}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              Go to Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading org membership
  if (loadingOrg || !orgFetched) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );

  // DB error — show it clearly so it can be diagnosed
  if (dbError) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow border border-red-200 p-8 space-y-4">
        <h2 className="text-lg font-extrabold text-red-700">Database Error</h2>
        <p className="text-sm text-gray-600">The app could not load your data. This usually means the SQL migration has not been run yet in Supabase.</p>
        <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 whitespace-pre-wrap break-all">{dbError}</pre>
        <p className="text-xs text-gray-500">Run <strong>RESET_AND_FIX.sql</strong> in the Supabase SQL Editor, then refresh this page.</p>
        <button onClick={() => { setDbError(null); setLoadingOrg(true); setMember(null); setOrg(null); }}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  // If user has an org, show redirect message
  if (org && member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Redirecting you to admin dashboard…</p>
      </div>
    );
  }

  // No org yet — show organization management dashboard
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-600 text-white rounded-lg p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">Organization Setup</h1>
              <p className="text-xs font-medium text-yellow-800">Create or join an organization</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-yellow-900 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Admin Dashboard
            </button>
            {userEmail && (
              <span className="hidden sm:block text-xs font-medium text-yellow-800 truncate max-w-[180px]">{userEmail}</span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <NoOrgDashboard
          userId={userId!}
          userEmail={userEmail}
          onOrgJoined={() => {
            // Refresh to load the new organization
            window.location.reload();
          }}
        />
      </main>
    </div>
  );
}
