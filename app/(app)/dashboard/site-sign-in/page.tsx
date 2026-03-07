"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCompanySites, fetchSiteVisitsForCompanySite, setActiveSite } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Site, SiteVisit, VisitorType } from "@/lib/workspace/types";

const VISITOR_TYPES: VisitorType[] = ["Worker", "Subcontractor", "Visitor", "Delivery"];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SiteSignInModulePage() {
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const profileActiveSiteId = summary?.profile?.active_site_id ?? null;

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("Worker");
  const [adding, setAdding] = useState(false);
  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);

  const canDelete = canManageSites(activeRole);

  useEffect(() => {
    if (!activeCompanyId) return;

    setPageLoading(true);
    setError(null);

    fetchCompanySites(activeCompanyId)
      .then((companySites) => {
        setSites(companySites);
        if (companySites.length === 0) {
          setSelectedSiteId("");
          setVisits([]);
          return;
        }

        const fallbackSite =
          (profileActiveSiteId && companySites.find((site) => site.id === profileActiveSiteId)?.id) || companySites[0].id;

        setSelectedSiteId((prev) => prev || fallbackSite);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load sites.");
      })
      .finally(() => setPageLoading(false));
  }, [activeCompanyId, profileActiveSiteId]);

  useEffect(() => {
    if (!activeCompanyId || !selectedSiteId) {
      setVisits([]);
      return;
    }

    fetchSiteVisitsForCompanySite(activeCompanyId, selectedSiteId)
      .then(setVisits)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load records."));
  }, [activeCompanyId, selectedSiteId]);

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;

  const onSiteCount = useMemo(() => visits.filter((visit) => !visit.signed_out_at).length, [visits]);
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return visits.filter((visit) => visit.signed_in_at.startsWith(today)).length;
  }, [visits]);

  async function handleSwitchSite(nextSiteId: string) {
    setSelectedSiteId(nextSiteId);
    setError(null);
    try {
      await setActiveSite(nextSiteId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set active site.");
    }
  }

  async function handleAddVisit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !selectedSiteId) return;

    setError(null);
    if (!fullName.trim() || !companyName.trim()) {
      setError("Full name and company name are required.");
      return;
    }

    setAdding(true);
    const { error: insertError } = await supabase.from("site_visits").insert({
      company_id: activeCompanyId,
      site_id: selectedSiteId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim() || null,
      company_name: companyName.trim(),
      visitor_type: visitorType,
    });

    setAdding(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setFullName("");
    setPhoneNumber("");
    setCompanyName("");
    setVisitorType("Worker");

    const nextVisits = await fetchSiteVisitsForCompanySite(activeCompanyId, selectedSiteId);
    setVisits(nextVisits);
  }

  async function handleSignOut(visitId: string) {
    setSigningOutId(visitId);
    const { error: updateError } = await supabase
      .from("site_visits")
      .update({ signed_out_at: new Date().toISOString() })
      .eq("id", visitId);
    setSigningOutId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (!activeCompanyId || !selectedSiteId) return;
    const nextVisits = await fetchSiteVisitsForCompanySite(activeCompanyId, selectedSiteId);
    setVisits(nextVisits);
  }

  async function handleDelete(visitId: string) {
    if (!canDelete) return;

    setDeletingId(visitId);
    const { error: deleteError } = await supabase.from("site_visits").delete().eq("id", visitId);
    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setVisits((prev) => prev.filter((visit) => visit.id !== visitId));
  }

  if (loading || pageLoading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Site Sign In requires a site</h1>
          <p className="mt-2 text-sm text-slate-600">Create a company site first, then launch Site Sign In records from here.</p>
          <Link
            href="/dashboard/sites"
            className="inline-block mt-6 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold px-5 py-3 rounded-xl text-sm"
          >
            Go to Sites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Site Sign In</h1>
            <p className="mt-1 text-sm text-slate-600">Company-scoped visitor records for the selected site.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSiteId}
              onChange={(e) => handleSwitchSite(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            {selectedSite && (
              <Link
                href={`/print-qr/${selectedSite.slug}`}
                className="bg-slate-900 hover:bg-black text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                Print QR
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Active Site" value={selectedSite?.name ?? "-"} />
          <Stat label="Currently On Site" value={String(onSiteCount)} />
          <Stat label="Signed In Today" value={String(todayCount)} />
        </div>
      </section>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Add Sign In Record</h2>
        <form className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={handleAddVisit}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          />
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Mobile (optional)"
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          />
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Employer / company"
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          />
          <select
            value={visitorType}
            onChange={(e) => setVisitorType(e.target.value as VisitorType)}
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          >
            {VISITOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
          >
            {adding ? "Adding..." : "Add Record"}
          </button>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Records</h2>

        {visits.length === 0 ? (
          <p className="text-sm text-slate-500">No records yet for this site.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 text-slate-500 uppercase tracking-wide text-xs">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Signed In</th>
                  <th className="py-2 pr-3">Signed Out</th>
                  <th className="py-2 pr-3">Signature</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-900">{visit.full_name}</p>
                      <p className="text-xs text-slate-500">{visit.phone_number ?? "-"}</p>
                    </td>
                    <td className="py-3 pr-3 text-slate-700">{visit.company_name}</td>
                    <td className="py-3 pr-3 text-slate-700">{visit.visitor_type}</td>
                    <td className="py-3 pr-3 text-slate-700">{formatDateTime(visit.signed_in_at)}</td>
                    <td className="py-3 pr-3 text-slate-700">
                      {visit.signed_out_at ? (
                        formatDateTime(visit.signed_out_at)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 rounded-full px-2 py-1 font-semibold">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          On site
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {visit.signature ? (
                        <button onClick={() => setViewSignature(visit.signature)} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {!visit.signed_out_at && (
                          <button
                            onClick={() => handleSignOut(visit.id)}
                            disabled={signingOutId === visit.id}
                            className="text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg px-3 py-1.5"
                          >
                            {signingOutId === visit.id ? "..." : "Sign Out"}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(visit.id)}
                            disabled={deletingId === visit.id}
                            className="text-xs font-bold text-red-600 hover:text-red-700"
                          >
                            {deletingId === visit.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewSignature && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={() => setViewSignature(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900">Visitor Signature</h3>
            <div className="mt-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
              <Image src={viewSignature} alt="Signature" width={640} height={240} unoptimized className="w-full h-auto" />
            </div>
            <button onClick={() => setViewSignature(null)} className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2.5 text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
