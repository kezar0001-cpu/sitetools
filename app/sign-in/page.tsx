"use client";

import { useEffect, useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type VisitorType = "Worker" | "Subcontractor" | "Visitor" | "Delivery";

interface Site {
  id: string; name: string; slug: string; logo_url?: string | null;
  latitude?: number | null; longitude?: number | null;
  company_id?: string | null;
  is_active?: boolean | null;
}

interface SiteVisit {
  id: string;
  full_name: string;
  phone_number?: string;
  company_name: string;
  visitor_type: VisitorType;
  signed_in_at: string;
  signed_out_at: string | null;
  site_id: string;
  company_id?: string | null;
  signature?: string | null;
  edit_reason?: string | null;
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
const HEADER_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// ─── Landing Page ────────────────────────────────────────────────────────────────

function NoSiteScreen() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-amber-400 border-b-4 border-amber-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 text-white rounded-lg p-2">{HEADER_SVG}</div>
            <div>
              <h1 className="text-2xl font-extrabold text-amber-950 tracking-tight">SiteSign</h1>
              <p className="text-xs font-medium text-amber-900">Construction Site Access Management</p>
            </div>
          </div>
          <a href="/login" className="hidden sm:block bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm">
            Admin Login
          </a>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-10 sm:space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-400 rounded-2xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
            Streamline Your Site<br />Access Management
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            A modern, paperless solution for tracking workers, subcontractors, visitors, and deliveries at construction sites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <div className="bg-amber-100 border-2 border-amber-400 rounded-2xl px-6 py-4 flex items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4.5 4.5l15 15" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Get Started</p>
                <p className="text-base font-bold text-amber-950">Scan the QR code at your site</p>
              </div>
            </div>
            <a href="/login" className="sm:hidden bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
              Admin Login
            </a>
          </div>
        </section>

        {/* Features Grid */}
        <section className="space-y-8 hidden sm:block">
          <h3 className="text-4xl font-black text-slate-900 text-center tracking-tight">Key Features</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4 hover:shadow-xl hover:border-amber-400 transition-all group">
              <div className="bg-blue-50 text-blue-600 rounded-2xl w-14 h-14 flex items-center justify-center transition-colors group-hover:bg-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-slate-900">Digital Sign In</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                Workers sign in digitally with their name and company. No more physical logbooks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4 hover:shadow-xl hover:border-amber-400 transition-all group">
              <div className="bg-purple-50 text-purple-600 rounded-2xl w-14 h-14 flex items-center justify-center transition-colors group-hover:bg-purple-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-slate-900">Signatures</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                Capture digital signatures for compliance. Touch-friendly pad works on any device.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-4 hover:shadow-xl hover:border-amber-400 transition-all group">
              <div className="bg-emerald-50 text-emerald-600 rounded-2xl w-14 h-14 flex items-center justify-center transition-colors group-hover:bg-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-slate-900">Live Tracking</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                See who&apos;s currently on site in real-time. Track durations automatically for payroll.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 sm:p-16 space-y-12">
          <h3 className="text-4xl font-black text-slate-900 text-center tracking-tight">How It Works</h3>
          <div className="grid sm:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="mx-auto bg-amber-400 text-amber-950 rounded-2xl w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-amber-100">
                1
              </div>
              <h4 className="text-xl font-black text-slate-900">Scan QR</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                Scan the unique QR code at the site entrance using your phone.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto bg-amber-400 text-amber-950 rounded-2xl w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-amber-100">
                2
              </div>
              <h4 className="text-xl font-black text-slate-900">Sign In</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                Enter details and provide a digital signature to confirm arrival.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto bg-amber-400 text-amber-950 rounded-2xl w-16 h-16 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-amber-100">
                3
              </div>
              <h4 className="text-xl font-black text-slate-900">Sign Out</h4>
              <p className="text-base text-slate-500 font-medium leading-relaxed">
                When leaving, scan again and tap sign-out. All tracked automatically.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-slate-900 rounded-3xl shadow-2xl p-8 sm:p-16 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 blur-[100px] -ml-32 -mb-32 rounded-full" />
          
          <h3 className="text-4xl font-black text-white tracking-tight relative z-10">Ready to Get Started?</h3>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium relative z-10">
            Scan the QR code at your construction site to sign in, or contact your site administrator for access.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 pt-4">
            <a href="/login" className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-10 py-5 rounded-2xl transition-all text-xl shadow-xl hover:scale-105 active:scale-95">
              Admin Dashboard
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-500 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-4">
          <p className="font-bold text-slate-300">Buildstate &copy; {new Date().getFullYear()}</p>
          <p className="text-sm font-medium">Digital Infrastructure for Modern Engineering</p>
          <div className="flex justify-center gap-8 pt-4">
            <a href="/login" className="text-slate-500 hover:text-amber-400 transition-colors text-sm font-black uppercase tracking-widest">Admin Login</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Archived site screen ─────────────────────────────────────────────────────

function SiteArchivedScreen({ site }: { site: Site }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-slate-700 border-b-4 border-slate-800 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="bg-slate-600 text-slate-300 rounded-xl p-2 shrink-0">
            {HEADER_SVG}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight truncate leading-none mb-1">{site.name}</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Site Access Registry</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-10 max-w-md w-full text-center space-y-6">
          <div className="mx-auto bg-slate-100 rounded-2xl w-16 h-16 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Not Accepting Sign-Ins</h2>
            <p className="text-slate-500 font-medium text-base leading-relaxed">
              This site is currently inactive and is not accepting visitor sign-ins. Please contact your site administrator for assistance.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-5 py-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Site</p>
            <p className="font-extrabold text-slate-700">{site.name}</p>
          </div>
        </div>
      </main>

      <footer className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] text-center py-6 space-y-2">
        <p>Buildstate Registry &copy; {new Date().getFullYear()}</p>
        <p><a href="/login" className="text-slate-500 hover:text-amber-400 transition-colors">Digital Portal</a></p>
      </footer>
    </div>
  );
}

// ─── Sign-In view for a specific site ────────────────────────────────────────

function SiteSignIn({ site }: { site: Site }) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("Worker");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [myVisit, setMyVisit] = useState<SiteVisit | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signError, setSignError] = useState(false);
  const sigPadRef = useRef<SignatureCanvas>(null);

  const [editingTime, setEditingTime] = useState(false);
  const [editTime, setEditTime] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editTimeSaving, setEditTimeSaving] = useState(false);

  // Check for existing active visit on mount
  useEffect(() => {
    const storedVisitId = localStorage.getItem(`active_visit_${site.id}`);
    if (!storedVisitId) {
      setLoadingSession(false);
      return;
    }
    // Fetch the visit from DB to verify it's still active
    supabase.from("site_visits")
      .select("*")
      .eq("id", storedVisitId)
      .eq("site_id", site.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && !data.signed_out_at) {
          // Visit exists and is still active
          setMyVisit(data as SiteVisit);
        } else {
          // Visit doesn't exist or already signed out - clear localStorage
          localStorage.removeItem(`active_visit_${site.id}`);
        }
        setLoadingSession(false);
      });
  }, [site.id]);

  function startEditTime(v: SiteVisit) {
    const d = new Date(v.signed_in_at);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setEditTime(`${hh}:${mm}`);
    setEditReason(v.edit_reason || "");
    setEditingTime(true);
  }

  async function handleSaveTime() {
    if (!editTime || !myVisit) return;
    if (!editReason.trim()) {
      setFormError("Please provide a reason for editing the sign-in time.");
      return;
    }

    setEditTimeSaving(true);
    const original = new Date(myVisit.signed_in_at);
    const [hh, mm] = editTime.split(":").map(Number);
    const updated = new Date(original);
    updated.setHours(hh, mm, 0, 0);

    const { data, error } = await supabase
      .from("site_visits")
      .update({
        signed_in_at: updated.toISOString(),
        edit_reason: editReason.trim()
      })
      .eq("id", myVisit.id)
      .select().single();

    setEditTimeSaving(false);
    if (error) {
      setFormError("Could not update sign-in time. Please try again.");
      return;
    }
    setMyVisit(data as SiteVisit);
    setEditingTime(false);
    setEditReason("");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim() || !phoneNumber.trim() || !companyName.trim()) {
      setFormError("Please fill in all fields.");
      return;
    }
    // Basic phone validation (lenient, supports +, spaces, hyphens)
    const normalizedPhone = phoneNumber.replace(/[\s()-]/g, "");
    if (!/^\+?\d{8,15}$/.test(normalizedPhone)) {
      setFormError("Please enter a valid mobile number.");
      return;
    }
    // Open signature modal instead of signing in directly
    setShowSignModal(true);
  }

  async function confirmSignIn() {
    if (!hasDrawn) {
      setSignError(true);
      return;
    }
    // Capture signature data from the raw canvas BEFORE any async work
    let signatureData: string | null = null;
    const sig = sigPadRef.current;
    if (sig) {
      const canvas = sig.getCanvas();
      signatureData = canvas.toDataURL("image/png");
    }
    setSubmitting(true);
    const visitId = crypto.randomUUID();
    const insertPayload: Record<string, unknown> = {
      id: visitId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      company_name: companyName.trim(),
      visitor_type: visitorType,
      site_id: site.id,
    };
    if (site.company_id) {
      insertPayload.company_id = site.company_id;
    }
    if (signatureData) {
      insertPayload.signature = signatureData;
    }
    const { error } = await supabase.from("site_visits").insert(insertPayload);
    setSubmitting(false);
    if (error) {
      setFormError(`Sign in failed: ${error.message}`);
      setShowSignModal(false);
      return;
    }
    const newVisit: SiteVisit = {
      id: visitId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      company_name: companyName.trim(),
      visitor_type: visitorType,
      site_id: site.id,
      company_id: site.company_id ?? null,
      signed_in_at: new Date().toISOString(),
      signed_out_at: null,
      signature: signatureData,
    };
    setMyVisit(newVisit);
    // Store visit ID in localStorage for session persistence
    localStorage.setItem(`active_visit_${site.id}`, visitId);
    setShowSignModal(false);
    setSuccess(true);
    setFullName(""); setPhoneNumber(""); setCompanyName(""); setVisitorType("Worker");
    setTimeout(() => setSuccess(false), 4000);
  }

  // Resize canvas to fill its container after modal mounts
  useEffect(() => {
    if (!showSignModal) return;
    const timer = setTimeout(() => {
      const sig = sigPadRef.current;
      if (sig) {
        const canvas = sig.getCanvas();
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.offsetWidth;
          canvas.height = 200;
          sig.clear(); // redraw background after resize
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [showSignModal]);

  async function confirmSignOut() {
    if (!myVisit) return;
    setSigningOut(true);
    const { error } = await supabase.from("site_visits")
      .update({ signed_out_at: new Date().toISOString() })
      .eq("id", myVisit.id);
    setSigningOut(false);
    if (error) {
      setFormError(`Sign-out failed: ${error.message}`);
      return;
    }
    // Clear localStorage session
    localStorage.removeItem(`active_visit_${site.id}`);
    setMyVisit(null);
  }

  // One-time cleanup: unregister any old service workers from the geofence era
  useEffect(() => {
    if ("serviceWorker" in navigator && !localStorage.getItem("sw_cleaned")) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) reg.unregister();
        localStorage.setItem("sw_cleaned", "1");
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-amber-400 border-b-4 border-amber-600 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-amber-600 text-white rounded-xl p-2 shrink-0">
              {site.logo_url ? (
                <Image
                  src={site.logo_url}
                  alt={`${site.name} logo`}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                  unoptimized
                />
              ) : (
                HEADER_SVG
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-amber-950 tracking-tight truncate leading-none mb-1">{site.name}</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-900 opacity-80">Site Access Registry</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-5 pb-10 space-y-6">
        {/* Loading state while checking for existing session */}
        {loadingSession && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent"></div>
            <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Checking Registry...</p>
          </div>
        )}

        {/* Sign In Form - only show if not loading and no active visit */}
        {!loadingSession && !myVisit && (
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-6 sm:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-amber-400 text-amber-950 rounded-2xl p-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mandatory Registry</p>
              </div>
            </div>
            {success && (
              <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-5 text-base font-bold">
                <div className="bg-emerald-500 text-white rounded-lg p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Signed in successfully. Welcome to site.
              </div>
            )}
            {formError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-5 text-base font-bold flex items-center gap-3">
                <div className="bg-red-500 text-white rounded-lg p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                {formError}
              </div>
            )}
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2" htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-amber-400 focus:bg-white bg-slate-50 transition-all font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2" htmlFor="phone_number">Mobile Number</label>
                <input
                  id="phone_number"
                  type="tel"
                  placeholder="0412 345 678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-amber-400 focus:bg-white bg-slate-50 transition-all font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2" htmlFor="company_name">Company Name</label>
                <input
                  id="company_name"
                  type="text"
                  placeholder="Acme Civil Pty Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoComplete="organization"
                  className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-amber-400 focus:bg-white bg-slate-50 transition-all font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2" htmlFor="visitor_type">Visitor Type</label>
                <select
                  id="visitor_type"
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value as VisitorType)}
                  className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg bg-slate-50 focus:outline-none focus:border-amber-400 focus:bg-white transition-all font-bold text-slate-900 appearance-none"
                >
                  {VISITOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-60 text-amber-950 font-black py-5 rounded-[1.5rem] transition-all text-xl shadow-xl shadow-amber-200 mt-2 hover:scale-[1.02] active:scale-[0.98]">
                {submitting ? "Signing In…" : "Confirm Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* My sign-in card — only shown after this visitor signs in */}
        {myVisit && (
          <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-200 p-8 space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Entry Recorded</h2>
            </div>
            <div className="border border-slate-100 rounded-[1.5rem] px-6 py-5 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-slate-900 text-lg">{myVisit.full_name}</span>
                    <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg border ${TYPE_COLOURS[myVisit.visitor_type]}`}>{myVisit.visitor_type}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">{myVisit.company_name}</div>
                  <div className="text-sm font-bold text-amber-600 mt-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Logged in at {formatTime(myVisit.signed_in_at)}
                  </div>
                </div>
                <button onClick={confirmSignOut} disabled={signingOut}
                  className="shrink-0 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-md active:scale-95">
                  {signingOut ? "Exit..." : "Sign Out"}
                </button>
              </div>
              <button
                onClick={() => startEditTime(myVisit)}
                className="text-xs text-slate-400 hover:text-amber-600 font-bold uppercase tracking-widest transition-colors"
              >
                Manual Time Adjustment
              </button>
            </div>
          </div>
        )}

        {/* Modal for editing sign-in time */}
        {editingTime && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 leading-tight">Edit Sign-In Time</h3>
                  <p className="text-sm text-gray-500">Correct your arrival time if needed.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">New Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-amber-400 bg-gray-50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Reason for Edit</label>
                  <textarea
                    placeholder="e.g. Forgot to sign in at the gate"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 bg-gray-50 min-h-[100px] resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveTime}
                  disabled={editTimeSaving || !editTime || !editReason.trim()}
                  className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg transition-all active:scale-[0.98]"
                >
                  {editTimeSaving ? "Saving..." : "Update Time"}
                </button>
                <button
                  onClick={() => { setEditingTime(false); setEditReason(""); }}
                  className="px-4 py-3.5 rounded-xl border-2 border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signature modal for sign-in */}
        {showSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Sign In to Site</h3>
                <p className="text-sm text-gray-500 mt-0.5">Please sign below to confirm your arrival at the site.</p>
              </div>
              <SignatureCanvas
                ref={sigPadRef}
                penColor="#0b1324"
                canvasProps={{
                  width: 340,
                  height: 200,
                  style: { width: "100%", height: "200px", display: "block", touchAction: "none" },
                }}
                backgroundColor="#f8fafc"
                onBegin={() => { setHasDrawn(true); setSignError(false); }}
              />
              {signError && (
                <p className="text-xs text-red-500 font-semibold -mt-1">Please sign before confirming.</p>
              )}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => { sigPadRef.current?.clear(); setHasDrawn(false); setSignError(false); }}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
                >
                  Clear
                </button>
                <p className="text-xs text-gray-400 italic">Sign with your finger</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmSignIn}
                  disabled={submitting}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  {submitting ? "Signing In…" : "Confirm Sign In"}
                </button>
                <button
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] text-center py-6 space-y-2">
        <p>Buildstate Registry &copy; {new Date().getFullYear()}</p>
        <p><a href="/login" className="text-slate-500 hover:text-amber-400 transition-colors">Digital Portal</a></p>
      </footer>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

const LEGACY_SITE_QUERY_KEYS = ["site", "slug", "siteSlug", "site_id"] as const;

function readLegacySiteLookupValue(params: URLSearchParams): string | null {
  for (const key of LEGACY_SITE_QUERY_KEYS) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function Home() {
  const [site, setSite] = useState<Site | null>(null);
  const [ready, setReady] = useState(false);
  const [lookupError, setLookupError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const siteLookupValue = readLegacySiteLookupValue(params);
    if (!siteLookupValue) {
      setReady(true);
      return;
    }

    const normalizedLookup = siteLookupValue.trim();
    const lookupField = isUuid(normalizedLookup) ? "id" : "slug";

    supabase
      .from("sites")
      .select("*")
      .eq(lookupField, lookupField === "slug" ? normalizedLookup.toLowerCase() : normalizedLookup)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { setLookupError(true); }
        else if (data) { setSite(data as Site); }
        setReady(true);
      });
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

  if (site.is_active === false) return <SiteArchivedScreen site={site} />;

  return <SiteSignIn site={site} />;
}
