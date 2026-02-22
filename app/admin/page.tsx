"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface Organisation { id: string; name: string; }
interface OrgMember { id: string; org_id: string; user_id: string; role: "admin" | "editor"; site_id: string | null; }
interface Site { id: string; name: string; slug: string; org_id: string; }

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

// ─── Auth Screen (Sign Up / Log In) ─────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setInfo("Check your email to confirm your account, then log in.");
      setMode("login");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      onAuth();
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
            <h1 className="text-xl font-extrabold text-gray-900">
              {mode === "login" ? "Admin Login" : "Create Account"}
            </h1>
            <p className="text-xs text-gray-500">SiteSign — Site Register</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
        )}
        {info && (
          <div className="bg-blue-50 border border-blue-300 text-blue-700 rounded-xl px-4 py-3 text-sm font-semibold">{info}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="auth_email">Email</label>
            <input
              id="auth_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="auth_pw">Password</label>
            <input
              id="auth_pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>
          <button
            type="submit" disabled={loading || !email || !password}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold py-3 rounded-xl transition-colors text-sm shadow"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="text-center space-y-2">
          {mode === "login" ? (
            <p className="text-xs text-gray-500">
              No account?{" "}
              <button onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
                className="font-semibold text-yellow-700 hover:underline">Sign up</button>
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); setInfo(null); }}
                className="font-semibold text-yellow-700 hover:underline">Log in</button>
            </p>
          )}
          <p className="text-xs text-gray-400">
            <a href="/" className="hover:underline text-gray-500">← Back to site sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Org Setup Screen ───────────────────────────────────────────────────────

function OrgSetupScreen({ userId, onDone }: { userId: string; onDone: (org: Organisation, member: OrgMember) => void }) {
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!orgName.trim()) return;
    setCreating(true);
    const { data: org, error: orgErr } = await supabase
      .from("organisations").insert({ name: orgName.trim() }).select().single();
    if (orgErr || !org) { setError("Could not create organisation."); setCreating(false); return; }
    const { data: member, error: memErr } = await supabase
      .from("org_members").insert({ org_id: org.id, user_id: userId, role: "admin" }).select().single();
    setCreating(false);
    if (memErr || !member) { setError("Could not set up membership."); return; }
    onDone(org as Organisation, member as OrgMember);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Create your Organisation</h1>
          <p className="text-sm text-gray-500 mt-1">This is the company or group that manages your sites.</p>
        </div>
        {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="org_name">Organisation Name</label>
            <input id="org_name" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Acme Constructions" autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
          </div>
          <button type="submit" disabled={creating || !orgName.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold py-3 rounded-xl transition-colors text-sm shadow">
            {creating ? "Creating\u2026" : "Create Organisation"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Site Switcher (admin only) ─────────────────────────────────────────────

function SiteSwitcher({ current, orgId, onSelect, onSitesLoaded }: {
  current: Site | null; orgId: string;
  onSelect: (s: Site | null) => void;
  onSitesLoaded?: (sites: Site[]) => void;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from("sites").select("*").eq("org_id", orgId).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) { setSites(data as Site[]); onSitesLoaded?.(data as Site[]); }
      });
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  function makeSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" + Math.random().toString(36).slice(2, 7);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) return;
    setCreating(true);
    const slug = makeSlug(newName.trim());
    const { data, error } = await supabase
      .from("sites").insert({ name: newName.trim(), slug, org_id: orgId }).select().single();
    setCreating(false);
    if (error || !data) { setError("Could not create site."); return; }
    const s = data as Site;
    const next = [s, ...sites];
    setSites(next);
    onSitesLoaded?.(next);
    setNewName("");
    onSelect(s);
    setOpen(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Active Site</p>
          <p className="text-lg font-extrabold text-gray-900">{current ? current.name : <span className="text-gray-400 font-normal">None selected</span>}</p>
        </div>
        <button onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          {open ? "Close" : "Switch / Add Site"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input type="text" placeholder="New site name\u2026" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
            <button type="submit" disabled={creating || !newName.trim()}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shrink-0">
              {creating ? "\u2026" : "Create"}
            </button>
          </form>
          {sites.length > 0 && (
            <ul className="space-y-1.5">
              {sites.map((s) => (
                <li key={s.id}>
                  <button onClick={() => { onSelect(s); setOpen(false); }}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                      current?.id === s.id
                        ? "border-yellow-400 bg-yellow-50 text-yellow-900 font-bold"
                        : "border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 text-gray-800 font-semibold"
                    }`}>
                    <span className="text-sm truncate">{s.name}</span>
                    {current?.id === s.id && <span className="text-xs text-yellow-700 shrink-0">Active</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Members Panel (admin only) ─────────────────────────────────────────────

function MembersPanel({ orgId, orgSites, currentUserId }: { orgId: string; orgSites: Site[]; currentUserId: string }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSiteId, setNewSiteId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from("org_members").select("*").eq("org_id", orgId);
    if (data) setMembers(data as OrgMember[]);
  }, [orgId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleAddEditor(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!newEmail.trim() || !newPassword || !newSiteId) {
      setAddError("Email, password, and site are required."); return;
    }
    setAdding(true);
    const res = await fetch("/api/create-editor", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), password: newPassword, org_id: orgId, site_id: newSiteId, requesting_user_id: currentUserId }),
    });
    const json = await res.json();
    setAdding(false);
    if (!res.ok) { setAddError(json.error ?? "Failed to create editor."); return; }
    setNewEmail(""); setNewPassword(""); setNewSiteId("");
    fetchMembers();
  }

  async function handleRemove(memberId: string, userId: string) {
    if (userId === currentUserId) return;
    setRemovingId(memberId);
    await supabase.from("org_members").delete().eq("id", memberId);
    setRemovingId(null);
    fetchMembers();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 text-yellow-900 rounded-lg p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">Team Members</span>
          <span className="text-xs text-gray-400 font-medium">({members.length})</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-4 space-y-5">
          {members.length > 0 && (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.role === "admin" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{m.role}</span>
                      <span className="text-xs text-gray-500 font-mono truncate">{m.user_id === currentUserId ? "(you)" : m.user_id.slice(0, 8) + "\u2026"}</span>
                    </div>
                    {m.site_id && <p className="text-xs text-gray-500 mt-0.5">Site: {orgSites.find((s) => s.id === m.site_id)?.name ?? m.site_id.slice(0, 8)}</p>}
                  </div>
                  {m.user_id !== currentUserId && (
                    <button onClick={() => handleRemove(m.id, m.user_id)} disabled={removingId === m.id}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50">
                      {removingId === m.id ? "\u2026" : "Remove"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Add Editor</p>
            {addError && <div className="mb-3 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{addError}</div>}
            <form onSubmit={handleAddEditor} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="editor@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Temporary Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to Site</label>
                  <select value={newSiteId} onChange={(e) => setNewSiteId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent">
                    <option value="">Select a site\u2026</option>
                    {orgSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={adding}
                className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                {adding ? "Creating\u2026" : "Create Editor Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard({ org, member, onLogout }: { org: Organisation; member: OrgMember; onLogout: () => void }) {
  const isAdmin = member.role === "admin";
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [orgSites, setOrgSites] = useState<Site[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email ?? null));
  }, []);

  // Editors: auto-load their assigned site
  useEffect(() => {
    if (!isAdmin && member.site_id) {
      supabase.from("sites").select("*").eq("id", member.site_id).single()
        .then(({ data }) => { if (data) setActiveSite(data as Site); });
    }
  }, [isAdmin, member.site_id]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addType, setAddType] = useState<VisitorType>("Worker");
  const [addSignedIn, setAddSignedIn] = useState("");
  const [addSignedOut, setAddSignedOut] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState<VisitorType | "">("");

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("site_visits").select("*").order("signed_in_at", { ascending: false });
    if (activeSite) query = query.eq("site_id", activeSite.id);
    const { data, error } = await query;
    if (!error && data) setVisits(data as SiteVisit[]);
    setLoading(false);
  }, [activeSite]);

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

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from("site_visits").delete().eq("id", id);
    setDeleting(null);
    setConfirmDelete(null);
    fetchVisits();
  }

  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addName.trim() || !addCompany.trim()) {
      setAddError("Full name and company are required.");
      return;
    }
    setAdding(true);
    const payload: Record<string, string> = {
      full_name: addName.trim(),
      company_name: addCompany.trim(),
      visitor_type: addType,
    };
    if (activeSite) payload.site_id = activeSite.id;
    if (addSignedIn) payload.signed_in_at = new Date(addSignedIn).toISOString();
    if (addSignedOut) payload.signed_out_at = new Date(addSignedOut).toISOString();
    const { error } = await supabase.from("site_visits").insert(payload);
    setAdding(false);
    if (error) { setAddError("Failed to add record. Please try again."); return; }
    setAddName(""); setAddCompany(""); setAddType("Worker"); setAddSignedIn(""); setAddSignedOut("");
    setShowAddForm(false);
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
              <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">{org.name}</h1>
              <p className="text-xs font-medium text-yellow-800">
                SiteSign — <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${isAdmin ? "bg-yellow-600 text-white" : "bg-blue-100 text-blue-800"}`}>{member.role}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden sm:block text-xs font-medium text-yellow-800 truncate max-w-[180px]">{userEmail}</span>
            )}
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
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Site switcher (admin only) */}
        {isAdmin && (
          <SiteSwitcher current={activeSite} orgId={org.id} onSelect={setActiveSite} onSitesLoaded={setOrgSites} />
        )}

        {/* Members panel (admin only) */}
        {isAdmin && (
          <MembersPanel orgId={org.id} orgSites={orgSites} currentUserId={member.user_id} />
        )}

        {/* QR Code panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 print:shadow-none">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 bg-white p-3 border-2 border-gray-200 rounded-xl">
              <QRCodeSVG
                value={typeof window !== "undefined"
                  ? `${window.location.origin}${activeSite ? `/?site=${activeSite.slug}` : ""}`
                  : ""}
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
                {typeof window !== "undefined"
                  ? `${window.location.origin}${activeSite ? `/?site=${activeSite.slug}` : ""}`
                  : ""}
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

        {/* Add Visit panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => { setShowAddForm((v) => !v); setAddError(null); }}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400 text-yellow-900 rounded-lg p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-sm">Add Visit Manually</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${showAddForm ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAddForm && (
            <form onSubmit={handleAddVisit} className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-4">
              {addError && (
                <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{addError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="add_name">Full Name *</label>
                  <input id="add_name" type="text" value={addName} onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="add_company">Company Name *</label>
                  <input id="add_company" type="text" value={addCompany} onChange={(e) => setAddCompany(e.target.value)}
                    placeholder="e.g. Acme Constructions"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="add_type">Visitor Type *</label>
                  <select id="add_type" value={addType} onChange={(e) => setAddType(e.target.value as VisitorType)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent">
                    {VISITOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="add_signed_in">Signed In (optional — defaults to now)</label>
                  <input id="add_signed_in" type="datetime-local" value={addSignedIn} onChange={(e) => setAddSignedIn(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="add_signed_out">Signed Out (optional — leave blank if still on site)</label>
                  <input id="add_signed_out" type="datetime-local" value={addSignedOut} onChange={(e) => setAddSignedOut(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={adding}
                  className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  {adding ? "Adding…" : "Add Visit"}
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setAddError(null); }}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-800 px-3 py-2.5">
                  Cancel
                </button>
              </div>
            </form>
          )}
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
                      <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
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
                          <div className="flex items-center gap-2">
                            {v.signed_out_at === null && (
                              <button
                                onClick={() => handleSignOut(v.id)}
                                disabled={signingOut === v.id}
                                className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {signingOut === v.id ? "…" : "Sign Out"}
                              </button>
                            )}
                            {confirmDelete === v.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-red-600 font-semibold">Delete?</span>
                                <button
                                  onClick={() => handleDelete(v.id)}
                                  disabled={deleting === v.id}
                                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  {deleting === v.id ? "…" : "Yes"}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(v.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {v.signed_out_at === null && (
                          <button
                            onClick={() => handleSignOut(v.id)}
                            disabled={signingOut === v.id}
                            className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {signingOut === v.id ? "…" : "Sign Out"}
                          </button>
                        )}
                        {confirmDelete === v.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(v.id)}
                              disabled={deleting === v.id}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              {deleting === v.id ? "…" : "Del?"}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 px-1.5 py-1.5">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(v.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
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
  const [userId, setUserId] = useState<string | null>(null);
  const [org, setOrg] = useState<Organisation | null>(null);
  const [member, setMember] = useState<OrgMember | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      if (session) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) setUserId(session.user.id);
      else { setUserId(null); setOrg(null); setMember(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load org membership once authenticated
  useEffect(() => {
    if (!userId) return;
    setLoadingOrg(true);
    supabase.from("org_members").select("*").eq("user_id", userId).limit(1).maybeSingle()
      .then(async ({ data: mem }) => {
        if (mem) {
          setMember(mem as OrgMember);
          const { data: orgData } = await supabase
            .from("organisations").select("*").eq("id", (mem as OrgMember).org_id).single();
          if (orgData) setOrg(orgData as Organisation);
        }
        setLoadingOrg(false);
      });
  }, [userId]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (authed === null) return null;

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  // Loading org membership
  if (loadingOrg) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );

  // No org yet — show setup screen
  if (!org || !member) return (
    <OrgSetupScreen userId={userId!} onDone={(o, m) => { setOrg(o); setMember(m); }} />
  );

  return <AdminDashboard org={org} member={member} onLogout={handleLogout} />;
}
