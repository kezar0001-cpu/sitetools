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
      <div className="flex gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse" />
        <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            disabled={disabled}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="flex gap-3">
        {/* Project Filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Site Filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Site
          </label>
          <select
            value={selectedSiteId}
            onChange={(e) => handleSiteChange(e.target.value)}
            disabled={disabled || filteredSites.length === 0}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
          >
            <option value="">All Sites</option>
            {filteredSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {selectedProjectId && filteredSites.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No sites for this project</p>
          )}
        </div>
      </div>

      {/* Active filter indicators */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedProjectId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
              Project: {projects.find(p => p.id === selectedProjectId)?.name || selectedProjectId}
              <button
                onClick={() => handleProjectChange("")}
                className="ml-1 hover:text-amber-900"
                aria-label="Remove project filter"
              >
                ×
              </button>
            </span>
          )}
          {selectedSiteId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
              Site: {sites.find(s => s.id === selectedSiteId)?.name || selectedSiteId}
              <button
                onClick={() => handleSiteChange("")}
                className="ml-1 hover:text-amber-900"
                aria-label="Remove site filter"
              >
                ×
              </button>
            </span>
          )}
          {showArchivedLocal && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
              Archived only
              <button
                onClick={() => handleArchivedChange(false)}
                className="ml-1 hover:text-slate-900"
                aria-label="Remove archived filter"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Archived Toggle */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchivedLocal}
            onChange={(e) => handleArchivedChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:opacity-50"
          />
          <span className="text-sm text-slate-700">Show archived diaries</span>
        </label>
      </div>
    </div>
  );
}
