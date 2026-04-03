"use client";

import { useState, useEffect } from "react";
import { getProjects, getSites } from "@/lib/workspace/client";
import type { Project, Site } from "@/lib/workspace/types";

interface NewDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (projectId: string | null, siteId: string | null) => void;
  companyId: string;
  isCreating: boolean;
  formTypeLabel?: string;
}

export function NewDiaryModal({
  isOpen,
  onClose,
  onCreate,
  companyId,
  isCreating,
  formTypeLabel = "Daily Diary",
}: NewDiaryModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !companyId) return;
    setLoading(true);
    Promise.all([getProjects(companyId), getSites(companyId)])
      .then(([projectsData, sitesData]) => {
        setProjects(projectsData);
        setSites(sitesData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [isOpen, companyId]);

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProjectId("");
      setSelectedSiteId("");
      setError(null);
    }
  }, [isOpen]);

  // Filter sites by selected project
  const filteredSites = selectedProjectId
    ? sites.filter((s) => s.project_id === selectedProjectId)
    : sites;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreate(
      selectedProjectId || null,
      selectedSiteId || null
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900">Create New {formTypeLabel}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select the project and site for this diary entry.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Project (optional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  // Clear site selection if project changes
                  if (selectedSiteId) {
                    const siteStillValid = sites.find(
                      (s) => s.id === selectedSiteId && s.project_id === e.target.value
                    );
                    if (!siteStillValid) setSelectedSiteId("");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              >
                <option value="">-- Select Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Site Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Site {filteredSites.length === 0 && selectedProjectId && "(no sites for this project)"}
              </label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={filteredSites.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
              >
                <option value="">-- Select Site --</option>
                {filteredSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                Required for SiteSign labour import
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !selectedSiteId}
                className="flex-1 py-3 rounded-xl bg-amber-400 text-slate-900 font-bold hover:bg-amber-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create Diary"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
