"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UnifiedOrgManagementPanel } from "./components/UnifiedOrgManagementPanel";

const MapPicker = dynamic(() => import("./components/MapPicker"), { ssr: false });

interface Organisation { id: string; name: string; created_at: string; is_public?: boolean; description?: string | null; join_code?: string | null; join_code_expires?: string | null; created_by?: string | null; }
interface OrgMember { id: string; org_id: string; user_id: string; role: "admin" | "editor" | "viewer"; site_id: string | null; }
interface Site { id: string; name: string; slug: string; org_id: string | null; created_by?: string | null; logo_url?: string | null; latitude?: number | null; longitude?: number | null; geofence_radius_km?: number; }

type VisitorType = "Worker" | "Subcontractor" | "Visitor" | "Delivery";

interface SiteVisit {
  id: string;
  full_name: string;
  phone_number?: string | null;
  company_name: string;
  visitor_type: VisitorType;
  signed_in_at: string;
  signed_out_at: string | null;
  site_id: string;
  signature?: string | null;
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
  const [mode, setMode] = useState<"login" | "signup" | "browse-orgs">("login");
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


// ─── Site Switcher (admin only) ─────────────────────────────────────────────

function SiteSwitcher({ current, orgId, userId, onSelect, onSitesLoaded, canAddSites = true }: {
  current: Site | null; orgId: string | null; userId: string | null;
  onSelect: (s: Site | null) => void;
  onSitesLoaded?: (sites: Site[]) => void;
  canAddSites?: boolean;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't query until we have a valid userId (auth may not have resolved yet)
    if (!orgId && !userId) return;

    let query = supabase.from("sites").select("*");
    if (orgId) {
      query = query.eq("org_id", orgId);
    } else {
      // Personal sites: only fetch when userId is a real non-empty string
      if (!userId) return;
      query = query.is("org_id", null).eq("created_by", userId);
    }
    query.order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) { setSites(data as Site[]); onSitesLoaded?.(data as Site[]); }
      });
  }, [orgId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  function makeSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" + Math.random().toString(36).slice(2, 7);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) return;
    if (!orgId && !userId) { setError("Not authenticated."); return; }
    setCreating(true);
    const slug = makeSlug(newName.trim());
    const insertData: Record<string, string> = { name: newName.trim(), slug };
    if (orgId) { insertData.org_id = orgId; }
    if (userId) { insertData.created_by = userId; }
    const { data, error } = await supabase
      .from("sites").insert(insertData).select().single();
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
          {open ? "Close" : sites.length > 0 ? "Switch site" : (canAddSites ? "Switch / Add Site" : "Switch site")}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
          {canAddSites && (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input type="text" placeholder="New site name…" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
              <button type="submit" disabled={creating || !newName.trim()}
                className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shrink-0">
                {creating ? "…" : "Create"}
              </button>
            </form>
          )}
          {sites.length > 0 && (
            <ul className="space-y-1.5">
              {sites.map((s) => (
                <li key={s.id}>
                  <button onClick={() => { onSelect(s); setOpen(false); }}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-colors ${current?.id === s.id
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


// ─── Geofence Settings ──────────────────────────────────────────────────────

const RADIUS_OPTIONS = [
  { value: 0.5, label: "500m" },
  { value: 1, label: "1 km" },
  { value: 2, label: "2 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
];

function GeofenceSettings({ site, onUpdate }: { site: Site; onUpdate: (s: Site) => void }) {
  const [lat, setLat] = useState<number | null>(site.latitude ?? null);
  const [lng, setLng] = useState<number | null>(site.longitude ?? null);
  const [radius, setRadius] = useState(site.geofence_radius_km ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLat(site.latitude ?? null);
    setLng(site.longitude ?? null);
    setRadius(site.geofence_radius_km ?? 1);
  }, [site.id, site.latitude, site.longitude, site.geofence_radius_km]);

  const handleLocationChange = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    if (lat === null || lng === null) {
      setError("Please set a location by searching for an address or clicking the map.");
      return;
    }
    setSaving(true);
    const { data, error: err } = await supabase
      .from("sites")
      .update({ latitude: lat, longitude: lng, geofence_radius_km: radius })
      .eq("id", site.id)
      .select("*")
      .single();
    setSaving(false);
    if (err || !data) {
      setError(err?.message ?? "Failed to save.");
      return;
    }
    onUpdate(data as Site);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const hasLocation = lat != null && lng != null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-green-100 text-green-700 rounded-lg p-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-gray-900">Geofence Settings</h3>
          <p className="text-xs text-gray-500">Set the site location and sign-out reminder radius</p>
        </div>
        {hasLocation && (
          <span className="ml-auto text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">Active</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">Settings saved!</div>
      )}

      {/* Map Picker */}
      <MapPicker
        latitude={lat}
        longitude={lng}
        onLocationChange={handleLocationChange}
      />

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Sign-out reminder radius</label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRadius(opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${radius === opt.value
                ? "bg-green-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Visitors will be reminded to sign out when they move more than {RADIUS_OPTIONS.find((o) => o.value === radius)?.label ?? `${radius}km`} from the site.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors"
      >
        {saving ? "Saving…" : "Save Geofence Settings"}
      </button>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard({ org, member, userId, onLogout, onOrgUpdate, onOrgDeleted }: {
  org: Organisation | null; member: OrgMember | null; userId: string | null; onLogout: () => void; onOrgUpdate?: (org: Organisation) => void; onOrgDeleted?: () => void;
}) {
  const isPersonal = !org || !member;
  const isAdmin = isPersonal || member?.role === "admin";
  const isViewer = !isPersonal && member?.role === "viewer";
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [orgSites, setOrgSites] = useState<Site[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email ?? null));
  }, []);

  // Editors and viewers: load sites they can access (RLS returns assigned sites for editors, all for viewers)
  useEffect(() => {
    if (!isAdmin && org?.id) {
      supabase.from("sites").select("*").eq("org_id", org.id).order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) {
            const list = data as Site[];
            setOrgSites(list);
            if (list.length > 0) setActiveSite((prev) => prev && list.some((s) => s.id === prev.id) ? prev : list[0]);
          }
        });
    }
  }, [isAdmin, org?.id]);



  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewingSig, setViewingSig] = useState<string | null>(null);

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
  const [csvDateRange, setCsvDateRange] = useState<"all" | "today" | "week" | "month">("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSignedIn, setEditSignedIn] = useState("");
  const [editSignedOut, setEditSignedOut] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function toDatetimeLocal(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEdit(v: SiteVisit) {
    setEditingId(v.id);
    setEditSignedIn(toDatetimeLocal(v.signed_in_at));
    setEditSignedOut(toDatetimeLocal(v.signed_out_at));
  }

  const fetchVisits = useCallback(async () => {
    if (!activeSite) { setVisits([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("site_visits").select("*")
      .eq("site_id", activeSite.id)
      .order("signed_in_at", { ascending: false });
    if (!error && data) setVisits(data as SiteVisit[]);
    setLoading(false);
  }, [activeSite]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  async function handleSaveEdit(id: string) {
    if (!editSignedIn) return;
    setEditSaving(true);
    const updates: Record<string, string | null> = {
      signed_in_at: new Date(editSignedIn).toISOString(),
      signed_out_at: editSignedOut ? new Date(editSignedOut).toISOString() : null,
    };
    const { error } = await supabase.from("site_visits").update(updates).eq("id", id);
    setEditSaving(false);
    if (error) { alert("Could not save changes. Please try again."); return; }
    setEditingId(null);
    fetchVisits();
  }

  async function handleSignOut(id: string) {
    setSigningOut(id);
    const { error } = await supabase
      .from("site_visits")
      .update({ signed_out_at: new Date().toISOString() })
      .eq("id", id);
    setSigningOut(null);
    if (error) { alert("Sign-out failed. Please try again."); return; }
    fetchVisits();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await supabase.from("site_visits").delete().eq("id", id);
    setDeleting(null);
    setConfirmDelete(null);
    if (error) { alert("Delete failed. Please try again."); return; }
    fetchVisits();
  }

  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!activeSite) {
      setAddError("Please select a site first.");
      return;
    }
    if (!addName.trim() || !addCompany.trim()) {
      setAddError("Full name and company are required.");
      return;
    }
    setAdding(true);
    const payload: Record<string, string> = {
      full_name: addName.trim(),
      company_name: addCompany.trim(),
      visitor_type: addType,
      site_id: activeSite.id,
    };
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

  function getFilteredDataByRange() {
    const now = new Date();
    let rangeFiltered = filtered;

    if (csvDateRange === "today") {
      const today = now.toISOString().slice(0, 10);
      rangeFiltered = filtered.filter((v) => v.signed_in_at.startsWith(today));
    } else if (csvDateRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      rangeFiltered = filtered.filter((v) => new Date(v.signed_in_at) >= weekAgo);
    } else if (csvDateRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      rangeFiltered = filtered.filter((v) => new Date(v.signed_in_at) >= monthAgo);
    }
    return rangeFiltered;
  }

  function prepareExportData() {
    const rangeFiltered = getFilteredDataByRange();
    const headers = ["Full Name", "Mobile", "Company", "Visitor Type", "Sign-In Date", "Sign-In Time", "Sign-Out Date", "Sign-Out Time", "Duration (hours)"];

    const rows = rangeFiltered.map((v) => {
      const signInDate = new Date(v.signed_in_at);
      const signOutDate = v.signed_out_at ? new Date(v.signed_out_at) : null;

      let duration = "";
      if (signOutDate) {
        const hours = (signOutDate.getTime() - signInDate.getTime()) / (1000 * 60 * 60);
        duration = hours.toFixed(2);
      } else {
        duration = "On site";
      }

      return [
        v.full_name,
        v.phone_number ?? "",
        v.company_name,
        v.visitor_type,
        signInDate.toLocaleDateString(),
        signInDate.toLocaleTimeString(),
        signOutDate ? signOutDate.toLocaleDateString() : "Still on site",
        signOutDate ? signOutDate.toLocaleTimeString() : "",
        duration
      ];
    });

    return { headers, rows, count: rangeFiltered.length };
  }

  function exportCSV() {
    const { headers, rows } = prepareExportData();
    const csvRows = rows.map((r) => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const rangeName = csvDateRange === "all" ? "all" : csvDateRange;
    a.download = `site-visits-${activeSite?.slug || "export"}-${rangeName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportXLSX() {
    const { headers, rows } = prepareExportData();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Full Name
      { wch: 16 }, // Mobile
      { wch: 25 }, // Company
      { wch: 15 }, // Visitor Type
      { wch: 15 }, // Sign-In Date
      { wch: 15 }, // Sign-In Time
      { wch: 15 }, // Sign-Out Date
      { wch: 15 }, // Sign-Out Time
      { wch: 18 }  // Duration
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Site Visits");
    const rangeName = csvDateRange === "all" ? "all" : csvDateRange;
    XLSX.writeFile(workbook, `site-visits-${activeSite?.slug || "export"}-${rangeName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPDF() {
    const { headers, rows, count } = prepareExportData();
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Site Visits Report - ${activeSite?.name || 'Export'}`, 14, 15);

    // Add metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const rangeName = csvDateRange === "all" ? "All Time" : csvDateRange === "today" ? "Today" : csvDateRange === "week" ? "Last 7 Days" : "Last 30 Days";
    doc.text(`Range: ${rangeName} | Total Records: ${count} | Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [250, 204, 21], textColor: [113, 63, 18], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 20 }
      }
    });

    const fileName = `site-visits-${activeSite?.slug || "export"}-${csvDateRange}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  async function uploadLogo(file: File) {
    if (!activeSite) return;
    setLogoError(null);
    setLogoUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const form = new FormData();
    form.set("site_id", activeSite.id);
    form.set("file", file);
    const res = await fetch("/api/upload-site-logo", {
      method: "POST",
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    setLogoUploading(false);
    if (!res.ok) {
      setLogoError(json.error ?? "Upload failed.");
      return;
    }
    const logoUrl = json.logo_url as string;
    const updated = { ...activeSite, logo_url: logoUrl };
    setActiveSite(updated);
    setOrgSites((prev) => prev.map((s) => (s.id === activeSite.id ? updated : s)));
  }

  async function removeLogo() {
    if (!activeSite) return;
    setLogoError(null);
    setLogoUploading(true);
    const { data, error } = await supabase
      .from("sites")
      .update({ logo_url: null })
      .eq("id", activeSite.id)
      .select("*")
      .single();
    setLogoUploading(false);
    if (error || !data) {
      setLogoError(error?.message ?? "Could not remove logo.");
      return;
    }
    const updated = data as Site;
    setActiveSite(updated);
    setOrgSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
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
              <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">{org ? org.name : "SiteSign"}</h1>
              <p className="text-xs font-medium text-yellow-800">
                {isPersonal ? (
                  "Personal Dashboard"
                ) : (
                  <>SiteSign — <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${isAdmin ? "bg-yellow-600 text-white" : "bg-blue-100 text-blue-800"}`}>{member!.role}</span></>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {isPersonal && (
              <a
                href="/admin/orgs"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-yellow-900 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Organizations
              </a>
            )}
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

        {/* Site switcher (admin + editor, or personal mode) */}
        {(isAdmin || member?.role === "editor") && (
          <SiteSwitcher
            current={activeSite}
            orgId={org?.id ?? null}
            userId={userId}
            onSelect={setActiveSite}
            onSitesLoaded={setOrgSites}
            canAddSites={isAdmin}
          />
        )}
        {isViewer && orgSites.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Viewing site</p>
            <select
              value={activeSite?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                const s = orgSites.find((x) => x.id === id);
                if (s) setActiveSite(s);
              }}
              className="mt-1 w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              {orgSites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Read-only access. You can view visits but not edit.</p>
          </div>
        )}

        {/* Organization management (admin only, only when in an org) */}
        {isAdmin && org && member && (
          <UnifiedOrgManagementPanel
            org={org}
            member={member}
            orgSites={orgSites}
            onOrgDeleted={onOrgDeleted}
            onOrgUpdated={onOrgUpdate}
          />
        )}

        {/* QR Code panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 print:shadow-none">
          {activeSite ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0 bg-white p-3 border-2 border-gray-200 rounded-xl">
                <QRCodeSVG
                  value={typeof window !== "undefined"
                    ? `${window.location.origin}/?site=${activeSite.slug}`
                    : ""}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#1c1917"
                  level={activeSite.logo_url ? "H" : "M"}
                  imageSettings={activeSite.logo_url ? { src: activeSite.logo_url, height: 44, width: 44, excavate: true } : undefined}
                />
              </div>
              <div className="text-center sm:text-left space-y-2">
                <h3 className="text-lg font-extrabold text-gray-900">Site Sign-In QR Code</h3>
                <p className="text-sm text-gray-500">
                  Print this page and post it at the site entrance. Visitors scan the QR code to sign in on their phone.
                </p>
                <p className="text-xs font-mono text-gray-400 break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/?site=${activeSite.slug}`
                    : ""}
                </p>
                {isAdmin && (
                  <div className="pt-2 space-y-2 max-w-md">
                    <p className="text-xs font-bold text-gray-700">Optional logo (embedded in the QR)</p>
                    {logoError && (
                      <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                        {logoError}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadLogo(f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
                      >
                        {logoUploading ? "Uploading…" : "Upload logo"}
                      </button>
                      {activeSite.logo_url && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          disabled={logoUploading}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg text-sm transition-colors shrink-0"
                        >
                          Remove logo
                        </button>
                      )}
                      <span className="text-xs text-gray-500">PNG, JPEG, WebP or SVG, max 2 MB</span>
                    </div>
                  </div>
                )}
                <a
                  href={`/print-qr/${activeSite.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-sm font-bold px-4 py-2 rounded-xl transition-colors print:hidden"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print QR Code
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <h3 className="text-lg font-extrabold text-gray-900">Site Sign-In QR Code</h3>
              <p className="text-sm text-gray-500">Select a site above to generate the QR code for visitor sign-in.</p>
            </div>
          )}
        </div>

        {/* Geofence Settings (admin only) */}
        {isAdmin && activeSite && (
          <GeofenceSettings site={activeSite} onUpdate={(updated) => {
            setActiveSite(updated);
            setOrgSites((prev) => prev.map((s) => s.id === updated.id ? updated : s));
          }} />
        )}

        {/* Add Visit panel (hidden for viewers) */}
        {!isViewer && (
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
        )}

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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Export Data</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={exportCSV}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={exportXLSX}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                XLSX
              </button>
              <button
                onClick={exportPDF}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            </div>
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
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="csv_range">
              CSV Export Range
            </label>
            <select
              id="csv_range"
              value={csvDateRange}
              onChange={(e) => setCsvDateRange(e.target.value as "all" | "today" | "week" | "month")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today Only</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
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
              {/* Desktop table - responsive with horizontal scroll */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-yellow-400 sticky top-0">
                    <tr className="text-left">
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Full Name</th>
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Mobile</th>
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Company</th>
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Type</th>
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Signed In</th>
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Signed Out</th>
                      <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap">Signature</th>
                      {!isViewer && <th className="px-3 lg:px-5 py-3 lg:py-4 font-bold text-gray-700 uppercase text-xs tracking-wider whitespace-nowrap text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((v) => !isViewer && editingId === v.id ? (
                      <tr key={v.id} className="bg-yellow-50 border-l-4 border-yellow-400">
                        <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">{v.full_name}</td>
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{v.phone_number || "—"}</td>
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{v.company_name}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_COLOURS[v.visitor_type]}`}>
                            {v.visitor_type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <input type="datetime-local" value={editSignedIn} onChange={(e) => setEditSignedIn(e.target.value)}
                            className="border-2 border-yellow-400 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-sm" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="datetime-local" value={editSignedOut} onChange={(e) => setEditSignedOut(e.target.value)}
                            className="border-2 border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm" />
                          {editSignedOut && (
                            <button onClick={() => setEditSignedOut("")} className="ml-1 text-xs text-gray-400 hover:text-gray-700 font-bold">✕</button>
                          )}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap" colSpan={2}>
                          <div className="flex items-center gap-2 justify-center">
                            <button onClick={() => handleSaveEdit(v.id)} disabled={editSaving || !editSignedIn}
                              className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow">
                              {editSaving ? "…" : "Save"}
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={v.id} className={`transition-all ${v.signed_out_at === null ? "bg-green-50 hover:bg-green-100 border-l-4 border-green-400" : "hover:bg-gray-50 border-l-4 border-transparent"}`}>
                        <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">{v.full_name}</td>
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{v.phone_number || "—"}</td>
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{v.company_name}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${TYPE_COLOURS[v.visitor_type]}`}>
                            {v.visitor_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-700 whitespace-nowrap font-medium">{fmt(v.signed_in_at)}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {v.signed_out_at ? (
                            <span className="text-gray-700 font-medium">{fmt(v.signed_out_at)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-green-700 font-bold text-xs bg-green-100 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              On site
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {v.signature ? (
                            <button onClick={() => setViewingSig(v.signature!)} className="hover:opacity-80 transition-opacity hover:scale-105 transform">
                              <Image
                                src={v.signature}
                                alt="Signature"
                                width={160}
                                height={64}
                                unoptimized
                                className="h-10 w-auto rounded-lg border-2 border-gray-200 shadow-sm"
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">—</span>
                          )}
                        </td>
                        {!isViewer && (
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(v)}
                                className="text-blue-500 hover:text-blue-700 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Edit
                              </button>
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
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list - hidden on medium screens and up */}
              <ul className="md:hidden divide-y divide-gray-100">
                {filtered.map((v) => !isViewer && editingId === v.id ? (
                  <li key={v.id} className="px-4 py-4 space-y-3 bg-yellow-50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{v.full_name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOURS[v.visitor_type]}`}>{v.visitor_type}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Signed In</label>
                        <input type="datetime-local" value={editSignedIn} onChange={(e) => setEditSignedIn(e.target.value)}
                          className="w-full border border-yellow-400 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Signed Out (leave blank if still on site)</label>
                        <div className="flex gap-1">
                          <input type="datetime-local" value={editSignedOut} onChange={(e) => setEditSignedOut(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                          {editSignedOut && (
                            <button onClick={() => setEditSignedOut("")} className="text-xs text-gray-400 hover:text-gray-600 px-2">✕</button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(v.id)} disabled={editSaving || !editSignedIn}
                        className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-3 py-2">
                        Cancel
                      </button>
                    </div>
                  </li>
                ) : (
                  <li key={v.id} className={`px-4 py-4 space-y-1.5 ${v.signed_out_at === null ? "bg-green-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-gray-900 text-sm truncate">{v.full_name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLOURS[v.visitor_type]}`}>
                          {v.visitor_type}
                        </span>
                      </div>
                      {!isViewer && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => startEdit(v)}
                            className="text-blue-500 hover:text-blue-700 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Edit
                          </button>
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
                      )}
                    </div>
                    {v.phone_number && <p className="text-xs text-gray-500">{v.phone_number}</p>}
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
                    {v.signature && (
                      <button onClick={() => setViewingSig(v.signature!)} className="mt-1 hover:opacity-80 transition-opacity">
                        <Image
                          src={v.signature}
                          alt="Signature"
                          width={140}
                          height={56}
                          unoptimized
                          className="h-8 w-auto rounded border border-gray-200"
                        />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      {/* Signature viewer modal */}
      {viewingSig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setViewingSig(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900">Visitor Signature</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-2">
              <Image
                src={viewingSig}
                alt="Signature"
                width={480}
                height={200}
                unoptimized
                className="w-full h-auto"
              />
            </div>
            <button onClick={() => setViewingSig(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

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
  const [orgFetched, setOrgFetched] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      if (session) {
        setUserId(session.user.id);
      } else {
        setOrgFetched(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (session) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
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

  // No redirect — always show the dashboard (personal or org mode)

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (authed === null) return null;

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

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

  return <AdminDashboard org={org} member={member} userId={userId} onLogout={handleLogout} onOrgUpdate={setOrg} onOrgDeleted={() => {
    setOrg(null);
    setMember(null);
  }} />;
}
