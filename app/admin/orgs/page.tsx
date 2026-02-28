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
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
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
          return;
        }
        if (mem) {
          setMember(mem as OrgMember);
          const { data: orgData, error: orgErr } = await supabase
            .from("organisations").select("*").eq("id", (mem as OrgMember).org_id).single();
          if (orgErr) {
            setDbError(`organisations error ${orgErr.code}: ${orgErr.message}`);
            setLoadingOrg(false);
            return;
          }
          if (orgData) setOrg(orgData as Organisation);
        }
        setLoadingOrg(false);
      });
  }, [userId]);

  // Redirect to main admin if user has an org
  useEffect(() => {
    if (authed && !loadingOrg && !dbError && org && member) {
      router.replace("/admin");
    }
  }, [authed, loadingOrg, dbError, org, member, router]);

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    );
  }

  // Loading org membership
  if (loadingOrg) return (
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
    <NoOrgDashboard
      userId={userId!}
      userEmail={userEmail}
      onOrgJoined={() => {
        // Refresh to load the new organization
        window.location.reload();
      }}
    />
  );
}
