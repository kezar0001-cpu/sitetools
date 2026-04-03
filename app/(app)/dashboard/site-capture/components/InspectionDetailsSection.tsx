"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "./SectionHeader";
import { INSPECTION_TYPES, INSPECTION_TYPE_LABELS } from "@/lib/site-capture/types";
import type { SiteDiaryFull, InspectionDetails, InspectionType } from "@/lib/site-capture/types";
import type { Project, Site } from "@/lib/workspace/types";

interface InspectionDetailsSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
  saving?: Record<string, boolean>;
  projects: Project[];
  sites: Site[];
  details?: InspectionDetails;
  onDetailsChange: (details: InspectionDetails) => void;
}

export function InspectionDetailsSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  projects,
  sites,
  details,
  onDetailsChange,
}: InspectionDetailsSectionProps) {
  const [localDetails, setLocalDetails] = useState<InspectionDetails>({
    inspection_type: "Routine",
    inspection_date: new Date().toISOString().slice(0, 10),
    inspection_time: new Date().toTimeString().slice(0, 5),
    project_id: diary.project_id,
    site_id: diary.site_id,
    area_location: "",
    itp_reference: "",
    itp_id: null,
    inspector_name: "",
    inspector_role: "",
    inspector_company: "",
    ...details,
  });

  // Sync with external details when they change
  useEffect(() => {
    if (details) {
      setLocalDetails((prev) => ({ ...prev, ...details }));
    }
  }, [details]);

  const handleChange = (field: keyof InspectionDetails, value: unknown) => {
    const updated = { ...localDetails, [field]: value };
    setLocalDetails(updated);
    onDetailsChange(updated);
  };

  // Filter sites by selected project
  const filteredSites = localDetails.project_id
    ? sites.filter((s) => s.project_id === localDetails.project_id)
    : sites;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Inspection Details"
          icon={
            <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Inspection Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Inspection Type <span className="text-red-500">*</span>
            </label>
            <select
              value={localDetails.inspection_type}
              onChange={(e) => handleChange("inspection_type", e.target.value as InspectionType)}
              disabled={isLocked}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
            >
              {INSPECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INSPECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={localDetails.inspection_date}
                onChange={(e) => handleChange("inspection_date", e.target.value)}
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
              <input
                type="time"
                value={localDetails.inspection_time || ""}
                onChange={(e) => handleChange("inspection_time", e.target.value || null)}
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Project and Site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project</label>
              <select
                value={localDetails.project_id || ""}
                onChange={(e) => {
                  const value = e.target.value || null;
                  handleChange("project_id", value);
                  // Clear site if it doesn't belong to new project
                  const siteBelongsToProject = filteredSites.some(s => s.id === localDetails.site_id);
                  if (!siteBelongsToProject && value) {
                    handleChange("site_id", null);
                  }
                }}
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Site</label>
              <select
                value={localDetails.site_id || ""}
                onChange={(e) => handleChange("site_id", e.target.value || null)}
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
              >
                <option value="">Select site...</option>
                {filteredSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Area/Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Area / Location Inspected
            </label>
            <input
              type="text"
              value={localDetails.area_location || ""}
              onChange={(e) => handleChange("area_location", e.target.value || null)}
              disabled={isLocked}
              placeholder="e.g., Level 2, Building A, Gridlines A1-D4"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
            />
          </div>

          {/* ITP Reference */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              ITP Reference
            </label>
            <input
              type="text"
              value={localDetails.itp_reference || ""}
              onChange={(e) => handleChange("itp_reference", e.target.value || null)}
              disabled={isLocked}
              placeholder="ITP number or reference (optional)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              Link to ITP record if available, or enter free text reference
            </p>
          </div>

          {/* Inspector Details */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Inspection Conducted By</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localDetails.inspector_name}
                  onChange={(e) => handleChange("inspector_name", e.target.value)}
                  disabled={isLocked}
                  placeholder="Inspector name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localDetails.inspector_role}
                    onChange={(e) => handleChange("inspector_role", e.target.value)}
                    disabled={isLocked}
                    placeholder="e.g., Site Engineer"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={localDetails.inspector_company}
                    onChange={(e) => handleChange("inspector_company", e.target.value)}
                    disabled={isLocked}
                    placeholder="e.g., BuildCorp Pty Ltd"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
