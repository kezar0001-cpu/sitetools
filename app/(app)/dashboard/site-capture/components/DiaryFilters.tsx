"use client";

import { useState, useEffect } from "react";
import { getProjects, getSites } from "@/lib/workspace/client";
import type { Project, Site } from "@/lib/workspace/types";

interface DiaryFiltersProps {
  companyId: string;
  onFilterChange: (projectId: string | null, siteId: string | null, showArchived: boolean) => void;
  disabled?: boolean;
  showArchived?: boolean;
}

export function DiaryFilters({ companyId, onFilterChange, disabled = false, showArchived = false }: DiaryFiltersProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [showArchivedLocal, setShowArchivedLocal] = useState<boolean>(showArchived);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    Promise.all([getProjects(companyId), getSites(companyId)])
      .then(([projectsData, sitesData]) => {
        setProjects(projectsData);
        setSites(sitesData);
      })
      .catch((err) => {
        console.error("Failed to load filter data:", err);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  // Filter sites by selected project
  const filteredSites = selectedProjectId
    ? sites.filter((s) => s.project_id === selectedProjectId)
    : sites;

  // Handle project change
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSiteId(""); // Reset site selection when project changes
    
    const newProjectId = projectId || null;
    const newSiteId = null; // Reset site filter when project changes
    onFilterChange(newProjectId, newSiteId, showArchivedLocal);
  };

  // Handle site change
  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    
    const newProjectId = selectedProjectId || null;
    const newSiteId = siteId || null;
    onFilterChange(newProjectId, newSiteId, showArchivedLocal);
  };

  // Handle archived toggle
  const handleArchivedChange = (show: boolean) => {
    setShowArchivedLocal(show);
    onFilterChange(selectedProjectId || null, selectedSiteId || null, show);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedProjectId("");
    setSelectedSiteId("");
    setShowArchivedLocal(false);
    onFilterChange(null, null, false);
  };

  const hasActiveFilters = selectedProjectId || selectedSiteId || showArchivedLocal;

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="w-40 h-10 bg-slate-200 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Project Filter */}
      <select
        value={selectedProjectId}
        onChange={(e) => handleProjectChange(e.target.value)}
        disabled={disabled || loading}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
      >
        <option value="">All Projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Site Filter */}
      <select
        value={selectedSiteId}
        onChange={(e) => handleSiteChange(e.target.value)}
        disabled={disabled || loading || filteredSites.length === 0}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
      >
        <option value="">All Sites</option>
        {filteredSites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Archived Toggle - inline */}
      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={showArchivedLocal}
          onChange={(e) => handleArchivedChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:opacity-50"
        />
        <span className="text-sm text-slate-600">Archived</span>
      </label>

      {/* Clear button - only when filters active */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          disabled={disabled}
          className="px-3 py-2 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
        >
          Clear
        </button>
      )}
    </div>
  );
}
