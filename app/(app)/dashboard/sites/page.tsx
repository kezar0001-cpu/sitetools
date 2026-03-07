"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCompanySites, setActiveSite } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Site } from "@/lib/workspace/types";

function toSlug(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "site"}-${suffix}`;
}

export default function SitesPage() {
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const activeSiteId = summary?.profile?.active_site_id ?? null;

  const [sites, setSites] = useState<Site[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditSites = canManageSites(activeRole);

  useEffect(() => {
    if (!activeCompanyId) return;

    setPageLoading(true);
    fetchCompanySites(activeCompanyId)
      .then((siteRows) => setSites(siteRows))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load sites."))
      .finally(() => setPageLoading(false));
  }, [activeCompanyId]);

  async function handleCreateSite(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canEditSites) return;

    setError(null);
    if (!name.trim()) {
      setError("Site name is required.");
      return;
    }

    setCreating(true);
    const slug = toSlug(name);
    const { error: insertError } = await supabase.from("sites").insert({
      company_id: activeCompanyId,
      name: name.trim(),
      slug,
    });

    if (insertError) {
      setError(insertError.message);
      setCreating(false);
      return;
    }

    setName("");
    const siteRows = await fetchCompanySites(activeCompanyId);
    setSites(siteRows);
    setCreating(false);
  }

  async function handleSelectSite(siteId: string) {
    setSwitchingSiteId(siteId);
    setError(null);
    try {
      await setActiveSite(siteId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set active site.");
    } finally {
      setSwitchingSiteId(null);
    }
  }

  if (loading || !summary || pageLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Sites</h1>
        <p className="mt-1 text-sm text-slate-600">
          Shared site records for your company. Active site drives Site Sign In and future modules.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Company Sites</h2>
          <span className="text-sm text-slate-500">{sites.length} sites</span>
        </div>

        {sites.length === 0 ? (
          <p className="text-sm text-slate-500">No sites yet.</p>
        ) : (
          <ul className="space-y-2">
            {sites.map((site) => {
              const isActive = site.id === activeSiteId;
              return (
                <li key={site.id} className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${isActive ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                  <div>
                    <p className="font-semibold text-slate-900">{site.name}</p>
                    <p className="text-xs text-slate-500">Slug: {site.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/print-qr/${site.slug}`}
                      className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Print QR
                    </Link>
                    <button
                      onClick={() => handleSelectSite(site.id)}
                      disabled={switchingSiteId === site.id}
                      className={`text-xs font-bold px-3 py-2 rounded-lg ${isActive ? "bg-amber-400 text-amber-900" : "bg-slate-900 text-white hover:bg-black"}`}
                    >
                      {switchingSiteId === site.id ? "Setting..." : isActive ? "Active" : "Set Active"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create Site</h2>
        {!canEditSites ? (
          <p className="mt-2 text-sm text-slate-600">Only Owner, Admin, or Manager roles can create/edit sites.</p>
        ) : (
          <form className="mt-4 flex flex-col sm:flex-row gap-3" onSubmit={handleCreateSite}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Site name"
              className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-5 py-3 text-sm"
            >
              {creating ? "Creating..." : "Create Site"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
