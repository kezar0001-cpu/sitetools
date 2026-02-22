"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type VisitorType = "Worker" | "Subcontractor" | "Visitor" | "Delivery";

interface Site { id: string; name: string; slug: string; }

interface SiteVisit {
  id: string;
  full_name: string;
  company_name: string;
  visitor_type: VisitorType;
  signed_in_at: string;
  signed_out_at: string | null;
  site_id: string;
}

const VISITOR_TYPES: VisitorType[] = ["Worker", "Subcontractor", "Visitor", "Delivery"];

const TYPE_COLOURS: Record<VisitorType, string> = {
  Worker: "bg-blue-100 text-blue-800",
  Subcontractor: "bg-purple-100 text-purple-800",
  Visitor: "bg-green-100 text-green-800",
  Delivery: "bg-orange-100 text-orange-800",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}
const HEADER_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// ─── No-site screen ────────────────────────────────────────────────────────────────

function NoSiteScreen() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-yellow-600 text-white rounded-lg p-2">{HEADER_SVG}</div>
          <div>
            <h1 className="text-2xl font-extrabold text-yellow-900 tracking-tight">SiteSign</h1>
            <p className="text-xs font-medium text-yellow-800">Construction Site Sign In / Sign Out</p>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center space-y-4">
          <div className="mx-auto bg-yellow-100 text-yellow-700 rounded-full w-14 h-14 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4.5 4.5l15 15" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Scan the QR Code</h2>
          <p className="text-sm text-gray-500">
            Use the QR code posted at the site entrance to sign in. This page can&apos;t be accessed directly.
          </p>
          <p className="text-xs text-gray-400 pt-2">
            Are you an admin?{" "}
            <a href="/admin" className="text-yellow-700 font-semibold hover:underline">Log in here</a>
          </p>
        </div>
      </main>
      <footer className="bg-gray-800 text-gray-400 text-sm text-center py-4">
        <p>SiteSign &copy; {new Date().getFullYear()} — Construction Site Access Management</p>
      </footer>
    </div>
  );
}

// ─── Sign-In view for a specific site ────────────────────────────────────────

function SiteSignIn({ site }: { site: Site }) {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("Worker");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [onSite, setOnSite] = useState<SiteVisit[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [signingOut, setSigningOut] = useState<string | null>(null);

  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editTimeSaving, setEditTimeSaving] = useState(false);

  function startEditTime(v: SiteVisit) {
    const d = new Date(v.signed_in_at);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setEditTime(`${hh}:${mm}`);
    setEditingTimeId(v.id);
  }

  const fetchOnSite = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_visits").select("*")
      .eq("site_id", site.id).is("signed_out_at", null)
      .order("signed_in_at", { ascending: false });
    if (!error && data) setOnSite(data as SiteVisit[]);
    setLoadingList(false);
  }, [site.id]);

  useEffect(() => { fetchOnSite(); }, [fetchOnSite]);

  async function handleSaveTime(v: SiteVisit) {
    if (!editTime) return;
    setEditTimeSaving(true);
    const original = new Date(v.signed_in_at);
    const [hh, mm] = editTime.split(":").map(Number);
    const updated = new Date(original);
    updated.setHours(hh, mm, 0, 0);
    const { error } = await supabase
      .from("site_visits")
      .update({ signed_in_at: updated.toISOString() })
      .eq("id", v.id);
    setEditTimeSaving(false);
    if (error) { setFormError("Could not update sign-in time. Please try again."); return; }
    setEditingTimeId(null);
    fetchOnSite();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim() || !companyName.trim()) { setFormError("Please fill in all fields."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("site_visits").insert({
      full_name: fullName.trim(), company_name: companyName.trim(),
      visitor_type: visitorType, site_id: site.id,
    });
    setSubmitting(false);
    if (error) { setFormError("Sign in failed. Please try again."); return; }
    setSuccess(true);
    setFullName(""); setCompanyName(""); setVisitorType("Worker");
    fetchOnSite();
    setTimeout(() => setSuccess(false), 5000);
  }

  async function handleSignOut(id: string) {
    setSigningOut(id);
    const { error } = await supabase.from("site_visits").update({ signed_out_at: new Date().toISOString() }).eq("id", id);
    setSigningOut(null);
    if (error) { setFormError("Sign-out failed. Please try again."); return; }
    fetchOnSite();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-yellow-600 text-white rounded-lg p-2 shrink-0">{HEADER_SVG}</div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight truncate">{site.name}</h1>
              <p className="text-xs font-medium text-yellow-800">Site Sign In / Sign Out</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-5 pb-10 space-y-6">
        {/* Sign In Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-yellow-400 text-yellow-900 rounded-lg p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Sign In to Site</h2>
          </div>
          {success && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 rounded-xl px-4 py-4 text-base font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Signed in successfully! Welcome to site.
            </div>
          )}
          {formError && (
            <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-4 text-base font-semibold">{formError}</div>
          )}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-1.5" htmlFor="full_name">Full Name</label>
              <input id="full_name" type="text" placeholder="e.g. Jane Smith" value={fullName}
                onChange={(e) => setFullName(e.target.value)} autoComplete="name"
                className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-1.5" htmlFor="company_name">Company Name</label>
              <input id="company_name" type="text" placeholder="e.g. Acme Constructions" value={companyName}
                onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization"
                className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-1.5" htmlFor="visitor_type">Visitor Type</label>
              <select id="visitor_type" value={visitorType} onChange={(e) => setVisitorType(e.target.value as VisitorType)}
                className="w-full border border-gray-300 rounded-xl px-4 py-4 text-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent">
                {VISITOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 disabled:opacity-60 text-yellow-900 font-extrabold py-5 rounded-2xl transition-colors text-xl shadow-md mt-1">
              {submitting ? "Signing In…" : "Sign In to Site"}
            </button>
          </form>
        </div>

        {/* On-Site Register */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
              <h2 className="text-lg font-extrabold text-gray-900">Currently On Site</h2>
            </div>
            <span className="text-sm font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              {onSite.length} {onSite.length === 1 ? "person" : "people"}
            </span>
          </div>
          {loadingList ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
          ) : onSite.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No one is currently signed in.</div>
          ) : (
            <ul className="space-y-3">
              {onSite.map((v) => (
                <li key={v.id} className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm truncate">{v.full_name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOURS[v.visitor_type]}`}>{v.visitor_type}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{v.company_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Signed in {formatDate(v.signed_in_at)} at {formatTime(v.signed_in_at)}
                      </div>
                    </div>
                    <button onClick={() => handleSignOut(v.id)} disabled={signingOut === v.id}
                      className="shrink-0 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                      {signingOut === v.id ? "…" : "Sign Out"}
                    </button>
                  </div>
                  {editingTimeId === v.id ? (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                      <span className="text-xs text-gray-500 font-semibold shrink-0">Signed in at:</span>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="border border-yellow-400 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                      <button
                        onClick={() => handleSaveTime(v)}
                        disabled={editTimeSaving || !editTime}
                        className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
                      >
                        {editTimeSaving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingTimeId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditTime(v)}
                      className="text-xs text-blue-500 hover:text-blue-700 font-semibold hover:underline"
                    >
                      Edit sign-in time
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-400 text-sm text-center py-4 space-y-1">
        <p>SiteSign &copy; {new Date().getFullYear()} — Construction Site Access Management</p>
        <p><a href="/admin" className="text-gray-500 hover:text-yellow-400 transition-colors text-xs">Admin</a></p>
      </footer>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function Home() {
  const [site, setSite] = useState<Site | null>(null);
  const [ready, setReady] = useState(false);
  const [lookupError, setLookupError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("site");
    if (slug) {
      supabase.from("sites").select("*").eq("slug", slug).maybeSingle()
        .then(({ data, error }) => {
          if (error) { setLookupError(true); }
          else if (data) { setSite(data as Site); }
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) return null;

  if (lookupError) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center space-y-4">
        <h2 className="text-xl font-extrabold text-gray-900">Something went wrong</h2>
        <p className="text-sm text-gray-500">Could not load site information. Please try again or scan the QR code.</p>
        <button onClick={() => window.location.reload()}
          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2.5 px-6 rounded-xl text-sm transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  if (!site) return <NoSiteScreen />;

  return <SiteSignIn site={site} />;
}
