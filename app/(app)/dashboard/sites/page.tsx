"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
  const [projectName, setProjectName] = useState("");
  const [projectSiteId, setProjectSiteId] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
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
    const [siteRows, projectRows] = await Promise.all([fetchCompanySites(activeCompanyId), fetchCompanyProjects(activeCompanyId)]);
    setSites(siteRows);
    setProjects(projectRows);
    setCreating(false);
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canEditSites) return;

    setError(null);
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }

    setCreatingProject(true);
    const { error: insertError } = await supabase.from("projects").insert({
      company_id: activeCompanyId,
      name: projectName.trim(),
      site_id: projectSiteId || null,
      status: "active",
    });

    if (insertError) {
      setError(insertError.message);
      setCreatingProject(false);
      return;
    }

    setProjectName("");
    setProjectSiteId("");
    const projectRows = await fetchCompanyProjects(activeCompanyId);
    setProjects(projectRows);
    setCreatingProject(false);
  }

  async function handleAssignSiteToProject(siteId: string, targetProjectId: string) {
    if (!canEditSites) return;
    setAllocatingSiteId(siteId);
    setError(null);

    try {
      const currentProject = projects.find((project) => project.site_id === siteId);

      if (currentProject && currentProject.id !== targetProjectId) {
        const { error: clearError } = await supabase.from("projects").update({ site_id: null }).eq("id", currentProject.id);
        if (clearError) throw clearError;
      }

      if (targetProjectId) {
        const { error: setErrorProject } = await supabase.from("projects").update({ site_id: siteId }).eq("id", targetProjectId);
        if (setErrorProject) throw setErrorProject;
      }

      if (activeCompanyId) {
        const projectRows = await fetchCompanyProjects(activeCompanyId);
        setProjects(projectRows);
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
          <span className="text-sm text-slate-500">{sites.length} sites • {projects.length} projects</span>
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
                    <p className="text-xs text-slate-500">
                      Project: {projects.find((project) => project.site_id === site.id)?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditSites && (
                      <select
                        value={projects.find((project) => project.site_id === site.id)?.id ?? ""}
                        onChange={(e) => handleAssignSiteToProject(site.id, e.target.value)}
                        disabled={allocatingSiteId === site.id}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white"
                      >
                        <option value="">No project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    )}
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

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Projects</h2>
          <span className="text-sm text-slate-500">{projects.length} projects</span>
        </div>

        {!canEditSites ? (
          <p className="text-sm text-slate-600">Only Owner, Admin, or Manager roles can create/edit projects.</p>
        ) : (
          <form className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3" onSubmit={handleCreateProject}>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
            />
            <select
              value={projectSiteId}
              onChange={(e) => setProjectSiteId(e.target.value)}
              className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm bg-white"
            >
              <option value="">No site assigned</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creatingProject}
              className="bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl px-5 py-3 text-sm"
            >
              {creatingProject ? "Creating..." : "Create Project"}
            </button>
          </form>
        )}

        {projects.length > 0 && (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id} className="border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500 capitalize">Status: {project.status}</p>
                </div>
                <div className="text-xs text-slate-500">
                  Linked Site: {sites.find((site) => site.id === project.site_id)?.name ?? "None"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
