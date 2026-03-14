"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCompanyProjects, fetchCompanySites, setActiveSite } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Project, Site } from "@/lib/workspace/types";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [name, setName] = useState("");
  const [targetProjectId, setTargetProjectId] = useState("");
  const [creating, setCreating] = useState(false);
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null);
  const [allocatingSiteId, setAllocatingSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditSites = canManageSites(activeRole);

  useEffect(() => {
    if (!activeCompanyId) return;

    setPageLoading(true);
    Promise.all([fetchCompanySites(activeCompanyId), fetchCompanyProjects(activeCompanyId)])
      .then(([siteRows, projectRows]) => {
        setSites(siteRows);
        setProjects(projectRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load sites."))
      .finally(() => setPageLoading(false));
  }, [activeCompanyId]);

  const groupedSites = useMemo(() => {
    const map = new Map<string | null, Site[]>();
    
    // Initialize map with projects to preserve order
    projects.forEach(p => map.set(p.id, []));
    map.set(null, []); // For unassigned

    sites.forEach(site => {
      const pid = site.project_id || null;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)?.push(site);
    });

    return Array.from(map.entries()).map(([projectId, siteList]) => ({
      projectId,
      project: projects.find(p => p.id === projectId),
      sites: siteList
    })).filter(group => group.project || group.sites.length > 0);
  }, [sites, projects]);

  async function handleCreateSite(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canEditSites) return;

    setError(null);
    if (!name.trim()) {
      setError("Site name is required.");
      return;
    }

    setCreating(true);
    try {
      const slug = toSlug(name);
      const { error: insertError } = await supabase.from("sites").insert({
        company_id: activeCompanyId,
        name: name.trim(),
        slug,
        project_id: targetProjectId || null
      });

      if (insertError) throw insertError;

      setName("");
      setTargetProjectId("");
      const siteRows = await fetchCompanySites(activeCompanyId);
      setSites(siteRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create site.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAssignSiteToProject(siteId: string, projectId: string | null) {
    if (!canEditSites) return;
    setAllocatingSiteId(siteId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("sites")
        .update({ project_id: projectId })
        .eq("id", siteId);
      if (updateError) throw updateError;

      if (activeCompanyId) {
        const siteRows = await fetchCompanySites(activeCompanyId);
        setSites(siteRows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign site to project.");
    } finally {
      setAllocatingSiteId(null);
    }
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
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h1>
          <p className="mt-1 text-slate-500 font-medium">
            Manage your company projects and their physical site locations.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Link href="/dashboard/team" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 bg-white">
                Manage Team
            </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-4 text-sm font-bold flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2 text-lg">✕</button>
        </div>
      )}

      {/* Grouped View */}
      <div className="space-y-10">
        {groupedSites.map((group) => (
          <section key={group.projectId || "unassigned"} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${group.project ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                   </svg>
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {group.project ? group.project.name : "Unassigned Locations"}
                    </h2>
                    {group.project && <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Project Dashboard</p>}
                </div>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {group.sites.length} Site{group.sites.length !== 1 ? "s" : ""}
              </span>
            </div>

            {group.sites.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                <p className="text-slate-400 text-sm font-medium">No sites allocated to this project.</p>
                {canEditSites && (
                  <button 
                    onClick={() => {
                        setTargetProjectId(group.projectId || "");
                        const el = document.getElementById("create-site-section");
                        el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="mt-3 text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    + Add a site here
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.sites.map((site) => {
                  const isActive = site.id === activeSiteId;
                  return (
                    <div 
                        key={site.id} 
                        className={`group relative bg-white border-2 rounded-3xl p-5 transition-all duration-200 shadow-sm ${
                            isActive ? "border-amber-400 bg-amber-50/30 scale-[1.02]" : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-2xl ${isActive ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors"}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        </div>
                        {isActive && (
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 leading-tight">{site.name}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1 mb-6">/{site.slug}</p>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleSelectSite(site.id)}
                                disabled={switchingSiteId === site.id}
                                className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all ${
                                    isActive 
                                    ? "bg-amber-400 text-amber-950 shadow-inner" 
                                    : "bg-slate-900 text-white hover:bg-black shadow-sm"
                                }`}
                            >
                                {switchingSiteId === site.id ? "Setting..." : isActive ? "Current Default" : "Set as Active"}
                            </button>
                            <Link
                                href={`/print-qr/${site.slug}`}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                                title="Print QR Code"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </Link>
                        </div>

                        {canEditSites && (
                            <div className="pt-2 border-t border-slate-100">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Move to Project</label>
                                <select
                                    value={site.project_id ?? ""}
                                    onChange={(e) => handleAssignSiteToProject(site.id, e.target.value || null)}
                                    disabled={allocatingSiteId === site.id}
                                    className="w-full text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:border-amber-400"
                                >
                                    <option value="">Move to Unassigned</option>
                                    {projects.filter(p => p.id !== site.project_id).map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                    ))}
                                </select>
                            </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      <section id="create-site-section" className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
        {/* Pattern decor */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="dotPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotPattern)" />
            </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight">Create New Site</h2>
            <p className="mt-2 text-slate-400 font-medium">
                Add a physical location to your company profile. You can allocate it to a project now or leave it unassigned.
            </p>
            
            {!canEditSites ? (
            <div className="mt-6 bg-white/10 rounded-2xl p-4 text-sm text-slate-300 border border-white/5">
                Only Workspace Owner or Managers can add new sites.
            </div>
            ) : (
            <form className="mt-8 space-y-4" onSubmit={handleCreateSite}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Site Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. South End Stormwater"
                            className="w-full bg-white/10 border border-white/10 focus:border-amber-400 outline-none rounded-2xl px-5 py-3.5 text-white placeholder-slate-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Allocated Project</label>
                        <select
                            value={targetProjectId}
                            onChange={(e) => setTargetProjectId(e.target.value)}
                            className="w-full bg-white/10 border border-white/10 focus:border-amber-400 outline-none rounded-2xl px-5 py-3.5 text-white appearance-none cursor-pointer transition-all font-medium"
                        >
                            <option value="" className="bg-slate-900 border-none">Unassigned Site</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id} className="bg-slate-900 border-none">
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={creating || !name.trim()}
                        className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-2xl px-8 py-3.5 text-sm transition-all shadow-lg shadow-amber-400/20"
                    >
                        {creating ? "Saving Site..." : "Create Site Record"}
                    </button>
                </div>
            </form>
            )}
        </div>
      </section>
    </div>
  );
}
