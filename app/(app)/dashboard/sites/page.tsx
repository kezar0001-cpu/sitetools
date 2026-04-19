"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchCompanyProjects, setActiveSite, updateSite, projectKeys } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Project, Site } from "@/lib/workspace/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCompanySites, useInvalidateSites } from "@/hooks/useSites";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { siteKeys } from "@/lib/workspace/client";
import {
  siteCreationSchema,
  siteEditSchema,
  type SiteCreationFormData,
  type SiteEditFormData,
} from "@/lib/validation/schemas";

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

  // Use TanStack Query for sites with 5-min stale time
  const { sites, isLoading: sitesLoading } = useCompanySites(activeCompanyId, {
    staleTime: 5 * 60 * 1000,
  });

  // Use TanStack Query for projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: projectKeys.company(activeCompanyId),
    queryFn: async () => {
      if (!activeCompanyId) return [];
      return fetchCompanyProjects(activeCompanyId);
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  // For cache invalidation after mutations
  const { invalidateCompanySites } = useInvalidateSites();
  const queryClient = useQueryClient();

  const pageLoading = loading || sitesLoading || projectsLoading;

  const [createSuccess, setCreateSuccess] = useState<{ siteName: string; projectName: string | null } | null>(null);
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null);
  const [allocatingSiteId, setAllocatingSiteId] = useState<string | null>(null);

  // Edit modal state
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Archive confirmation state
  const [archivingSiteId, setArchivingSiteId] = useState<string | null>(null);
  const [confirmArchiveSite, setConfirmArchiveSite] = useState<Site | null>(null);

  // Site creation form with react-hook-form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors, isSubmitting: creating, isValid: createIsValid },
    reset: resetCreate,
    setValue: setCreateValue,
  } = useForm<SiteCreationFormData>({
    resolver: zodResolver(siteCreationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      projectId: "",
    },
  });

  // Site edit form with react-hook-form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: editSaving, isValid: editIsValid },
    reset: resetEdit,
  } = useForm<SiteEditFormData>({
    resolver: zodResolver(siteEditSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
    },
  });

  const canEditSites = canManageSites(activeRole);

  // Sites and projects are now automatically fetched via TanStack Query

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

  async function handleCreateSite(data: SiteCreationFormData) {
    if (!activeCompanyId || !canEditSites) return;

    // Create optimistic site with temporary ID
    const tempId = `temp-${Date.now()}`;
    const slug = toSlug(data.name);
    const projectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name ?? null : null;

    const optimisticSite: Site = {
      id: tempId,
      company_id: activeCompanyId,
      project_id: data.projectId || null,
      name: data.name.trim(),
      slug,
      logo_url: null,
      is_active: true,
      timezone: null,
      created_at: new Date().toISOString(),
      // Optimistic indicator
      _optimistic: true,
    } as Site;

    // Get current sites for rollback
    const currentSites = queryClient.getQueryData<Site[]>(siteKeys.company(activeCompanyId)) ?? [];

    // Immediately add optimistic site to cache
    queryClient.setQueryData<Site[]>(siteKeys.company(activeCompanyId), (old) => {
      return [optimisticSite, ...(old ?? [])];
    });

    resetCreate();

    try {
      const { error: insertError } = await supabase.from("sites").insert({
        company_id: activeCompanyId,
        name: data.name.trim(),
        slug,
        project_id: data.projectId || null
      });

      if (insertError) throw insertError;

      // Invalidate to get server-generated ID and full data
      invalidateCompanySites(activeCompanyId);
      setCreateSuccess({ siteName: data.name.trim(), projectName });
      toast.success("Site created.");
    } catch (err) {
      // Rollback: restore previous sites on error
      queryClient.setQueryData(siteKeys.company(activeCompanyId), currentSites);
      toast.error(err instanceof Error ? err.message : "Could not create site.");
    }
  }

  async function handleAssignSiteToProject(siteId: string, projectId: string | null) {
    if (!canEditSites) return;
    setAllocatingSiteId(siteId);

    try {
      const { error: updateError } = await supabase
        .from("sites")
        .update({ project_id: projectId })
        .eq("id", siteId);
      if (updateError) throw updateError;

      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      toast.success("Site moved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign site to project.");
    } finally {
      setAllocatingSiteId(null);
    }
  }

  async function handleSelectSite(siteId: string) {
    setSwitchingSiteId(siteId);
    try {
      await setActiveSite(siteId);
      await refresh();
      toast.success("Active site updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to set active site.");
    } finally {
      setSwitchingSiteId(null);
    }
  }

  function openEditModal(site: Site) {
    setEditingSite(site);
    resetEdit({ name: site.name });
  }

  async function handleSaveEdit(data: SiteEditFormData) {
    if (!editingSite || !canEditSites) return;

    try {
      const newSlug = toSlug(data.name);
      await updateSite(editingSite.id, { name: data.name.trim(), slug: newSlug });
      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      setEditingSite(null);
      toast.success("Site updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update site.");
    }
  }

  async function handleArchiveSite(site: Site) {
    if (!canEditSites) return;
    setArchivingSiteId(site.id);
    try {
      await updateSite(site.id, { is_active: false });
      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      toast.success("Site archived.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive site.");
    } finally {
      setArchivingSiteId(null);
      setConfirmArchiveSite(null);
    }
  }

  async function handleRestoreSite(siteId: string) {
    if (!canEditSites) return;
    try {
      await updateSite(siteId, { is_active: true });
      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      toast.success("Site restored.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore site.");
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sites</h1>
          <p className="mt-1 text-slate-500 font-medium">
            Sites are physical locations where work happens. Each site gets a QR code for SiteSign and powers all field workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Link href="/dashboard/team" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 bg-white">
                Manage Team
            </Link>
        </div>
      </div>

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
              <EmptyState
                icon="🏗️"
                title={group.project ? "Add your first site to this project" : "Create your first site"}
                description={group.project 
                  ? "Sites are physical locations with QR codes for sign-in. Create a site to activate SiteSign."
                  : "Sites belong to projects and get QR codes for SiteSign. Create a project first if you haven't already."}
                action={canEditSites ? {
                  label: "+ Create site",
                  onClick: () => {
                    setCreateValue("projectId", group.projectId || "");
                    document.getElementById("create-site-section")?.scrollIntoView({ behavior: "smooth" });
                  },
                } : undefined}
                className="bg-white border-2 border-dashed border-slate-200 rounded-3xl"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.sites.map((site) => {
                  const isActive = site.id === activeSiteId;
                  const isArchived = site.is_active === false;
                  return (
                    <div
                        key={site.id}
                        className={`group relative bg-white border-2 rounded-3xl p-5 transition-all duration-200 shadow-sm ${
                            isArchived
                            ? "border-slate-200 bg-slate-50/60 opacity-70"
                            : isActive
                            ? "border-amber-400 bg-amber-50/30 scale-[1.02]"
                            : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-2xl ${isArchived ? "bg-slate-100 text-slate-300" : isActive ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors"}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        </div>
                        <div className="flex items-center gap-2">
                          {isArchived && (
                            <span className="bg-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Archived</span>
                          )}
                          {isActive && !isArchived && (
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Working Site</span>
                          )}
                        </div>
                      </div>

                      <h3 className={`font-extrabold leading-tight ${isArchived ? "text-slate-400" : "text-slate-900"}`}>{site.name}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-1 mb-6">/{site.slug}</p>

                      <div className="space-y-3">
                        {isArchived ? (
                          /* Archived site actions */
                          canEditSites && (
                            <button
                              onClick={() => handleRestoreSite(site.id)}
                              className="w-full text-xs font-bold py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                            >
                              Restore Site
                            </button>
                          )
                        ) : (
                          /* Active site actions */
                          <>
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
                                    {switchingSiteId === site.id ? "Setting..." : isActive ? "Active Site" : "Make Active"}
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
                              <>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditModal(site)}
                                    className="flex-1 text-xs font-bold py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                                  >
                                    Edit Name
                                  </button>
                                  <button
                                    onClick={() => setConfirmArchiveSite(site)}
                                    disabled={archivingSiteId === site.id}
                                    className="flex-1 text-xs font-bold py-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                                  >
                                    {archivingSiteId === site.id ? "Archiving..." : "Archive"}
                                  </button>
                                </div>

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
                              </>
                            )}
                          </>
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
            <h2 className="text-2xl font-black tracking-tight">Create a Site</h2>
            <p className="mt-2 text-slate-400 font-medium">
                Sites are physical work locations. Each site gets a unique QR code for SiteSign and becomes the hub for ITPs, diaries, and field records. Choose an active site to start working.
            </p>

            {!canEditSites ? (
            <div className="mt-6 bg-white/10 rounded-2xl p-4 text-sm text-slate-300 border border-white/5">
                Only Workspace Owner or Managers can add new sites.
            </div>
            ) : createSuccess ? (
              <div className="mt-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{createSuccess.siteName} is ready</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {createSuccess.projectName ? `Added to ${createSuccess.projectName}. ` : ""}
                      Your site has a unique QR code for SiteSign.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <button
                        onClick={() => {
                          const newSite = sites.find(s => s.name === createSuccess.siteName);
                          if (newSite) window.open(`/print-qr/${newSite.slug}`, '_blank');
                        }}
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Print QR Code
                      </button>
                      <button
                        onClick={() => setCreateSuccess(null)}
                        className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
                      >
                        Create another site →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <form className="mt-8 space-y-4" onSubmit={handleSubmitCreate(handleCreateSite)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Site Name</label>
                        <input
                            {...registerCreate("name")}
                            placeholder="e.g. South End Stormwater"
                            className={`w-full bg-white/10 border ${createErrors.name ? "border-red-400" : "border-white/10 focus:border-amber-400"} outline-none rounded-2xl px-5 py-3.5 text-white placeholder-slate-500 transition-all font-medium`}
                        />
                        {createErrors.name && (
                            <p className="mt-1.5 ml-1 text-xs text-red-400">{createErrors.name.message}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Allocated Project</label>
                        <select
                            {...registerCreate("projectId")}
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
                        disabled={creating || !createIsValid}
                        className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-2xl px-8 py-3.5 text-sm transition-all shadow-lg shadow-amber-400/20"
                    >
                        {creating ? "Saving Site..." : "Create Site Record"}
                    </button>
                </div>
            </form>
            )}
        </div>
      </section>

      {/* Edit Site Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Edit Site</h3>
                <p className="text-sm text-slate-500">A new URL slug will be generated.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitEdit(handleSaveEdit)} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Site Name</label>
                <input
                  type="text"
                  {...registerEdit("name")}
                  placeholder="e.g. North Pier Construction"
                  className={`w-full border-2 ${editErrors.name ? "border-red-300 focus:border-red-400" : "border-slate-100 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm font-bold focus:outline-none bg-slate-50 transition-colors text-slate-900`}
                  autoFocus
                />
                {editErrors.name && (
                  <p className="mt-1.5 text-xs text-red-500">{editErrors.name.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={editSaving || !editIsValid}
                  className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg transition-all active:scale-[0.98]"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {confirmArchiveSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-600 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Archive Site?</h3>
                <p className="text-sm text-slate-500">This will disable the public sign-in page.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              <span className="font-bold">{confirmArchiveSite.name}</span> will be marked as inactive. Existing visit records are preserved. You can restore it at any time.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleArchiveSite(confirmArchiveSite)}
                disabled={archivingSiteId === confirmArchiveSite.id}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg transition-all active:scale-[0.98]"
              >
                {archivingSiteId === confirmArchiveSite.id ? "Archiving..." : "Yes, Archive Site"}
              </button>
              <button
                onClick={() => setConfirmArchiveSite(null)}
                className="px-4 py-3 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
