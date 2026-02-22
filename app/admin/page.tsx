"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

type VisitorType = "Worker" | "Subcontractor" | "Visitor" | "Delivery";

interface SiteVisit {
  id: string;
  full_name: string;
  company_name: string;
  visitor_type: VisitorType;
  signed_in_at: string;
  signed_out_at: string | null;
}

const VISITOR_TYPES: VisitorType[] = ["Worker", "Subcontractor", "Visitor", "Delivery"];

const TYPE_COLOURS: Record<VisitorType, string> = {
  Worker: "bg-blue-100 text-blue-800",
  Subcontractor: "bg-purple-100 text-purple-800",
  Visitor: "bg-green-100 text-green-800",
  Delivery: "bg-orange-100 text-orange-800",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toLocalDateValue(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem("admin_authed", "1");
        onLogin();
      } else {
        setError(data.error ?? "Incorrect password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 text-yellow-900 rounded-lg p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Admin Access</h1>
            <p className="text-xs text-gray-500">SiteSign — Site Register</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="admin_pw">
              Password
            </label>
            <input
              id="admin_pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold py-3 rounded-xl transition-colors text-sm shadow"
          >
            {loading ? "Checking…" : "Log In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          <a href="/" className="hover:underline text-gray-500">← Back to site sign in</a>
        </p>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState<VisitorType | "">("");

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_visits")
      .select("*")
      .order("signed_in_at", { ascending: false });
    if (!error && data) setVisits(data as SiteVisit[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  async function handleSignOut(id: string) {
    setSigningOut(id);
    await supabase
      .from("site_visits")
      .update({ signed_out_at: new Date().toISOString() })
      .eq("id", id);
    setSigningOut(null);
    fetchVisits();
  }

  const filtered = visits.filter((v) => {
    const dateMatch = filterDate ? toLocalDateValue(v.signed_in_at) === filterDate : true;
    const typeMatch = filterType ? v.visitor_type === filterType : true;
    return dateMatch && typeMatch;
  });

  const onSiteCount = visits.filter((v) => v.signed_out_at === null).length;

  function exportCSV() {
    const headers = ["Full Name", "Company", "Visitor Type", "Signed In", "Signed Out"];
    const rows = filtered.map((v) => [
      `"${v.full_name.replace(/"/g, '""')}"`,
      `"${v.company_name.replace(/"/g, '""')}"`,
      v.visitor_type,
      fmt(v.signed_in_at),
      v.signed_out_at ? fmt(v.signed_out_at) : "Still on site",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-visits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
              <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">SiteSign Admin</h1>
              <p className="text-xs font-medium text-yellow-800">Site Visit Register</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">

        {/* QR Code panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 print:shadow-none">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 bg-white p-3 border-2 border-gray-200 rounded-xl">
              <QRCodeSVG
                value={typeof window !== "undefined" ? window.location.origin : ""}
                size={160}
                bgColor="#ffffff"
                fgColor="#1c1917"
                level="M"
              />
            </div>
            <div className="text-center sm:text-left space-y-2">
              <h3 className="text-lg font-extrabold text-gray-900">Site Sign-In QR Code</h3>
              <p className="text-sm text-gray-500">
                Print this page and post it at the site entrance. Visitors scan the QR code to sign in on their phone.
              </p>
              <p className="text-xs font-mono text-gray-400 break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}
              </p>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-sm font-bold px-4 py-2 rounded-xl transition-colors print:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On Site Now</span>
            </div>
            <p className="text-4xl font-extrabold text-gray-900">{onSiteCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Visits</p>
            <p className="text-4xl font-extrabold text-gray-900">{visits.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Showing</p>
            <p className="text-4xl font-extrabold text-gray-900">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-center">
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors w-full justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="filter_date">
              Filter by Date
            </label>
            <input
              id="filter_date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="filter_type">
              Filter by Visitor Type
            </label>
            <select
              id="filter_type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as VisitorType | "")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="">All Types</option>
              {VISITOR_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {(filterDate || filterType) && (
            <button
              onClick={() => { setFilterDate(""); setFilterType(""); }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline whitespace-nowrap pb-2.5"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No records match the current filters.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Full Name</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Company</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Signed In</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Signed Out</th>
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((v) => (
                      <tr key={v.id} className={v.signed_out_at === null ? "bg-green-50" : ""}>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{v.full_name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.company_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOURS[v.visitor_type]}`}>
                            {v.visitor_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(v.signed_in_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {v.signed_out_at ? (
                            <span className="text-gray-600">{fmt(v.signed_out_at)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                              On site
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {v.signed_out_at === null && (
                            <button
                              onClick={() => handleSignOut(v.id)}
                              disabled={signingOut === v.id}
                              className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {signingOut === v.id ? "…" : "Sign Out"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <ul className="sm:hidden divide-y divide-gray-100">
                {filtered.map((v) => (
                  <li key={v.id} className={`px-4 py-4 space-y-1.5 ${v.signed_out_at === null ? "bg-green-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-gray-900 text-sm truncate">{v.full_name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLOURS[v.visitor_type]}`}>
                          {v.visitor_type}
                        </span>
                      </div>
                      {v.signed_out_at === null && (
                        <button
                          onClick={() => handleSignOut(v.id)}
                          disabled={signingOut === v.id}
                          className="shrink-0 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {signingOut === v.id ? "…" : "Sign Out"}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{v.company_name}</p>
                    <p className="text-xs text-gray-400">In: {fmt(v.signed_in_at)}</p>
                    <p className="text-xs text-gray-400">
                      Out:{" "}
                      {v.signed_out_at ? (
                        fmt(v.signed_out_at)
                      ) : (
                        <span className="text-green-700 font-semibold">Still on site</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 text-gray-400 text-sm text-center py-4">
        <p>SiteSign Admin &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(sessionStorage.getItem("admin_authed") === "1");
  }, []);

  function handleLogin() {
    setAuthed(true);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_authed");
    setAuthed(false);
  }

  if (authed === null) return null;

  return authed ? (
    <AdminDashboard onLogout={handleLogout} />
  ) : (
    <LoginScreen onLogin={handleLogin} />
  );
}
