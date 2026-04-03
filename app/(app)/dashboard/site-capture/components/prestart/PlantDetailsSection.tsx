"use client";

import { useState, useEffect } from "react";
import type { PlantDetails } from "@/lib/site-capture/types";
import type { Project, Site } from "@/lib/workspace/types";
import { SectionHeader } from "../SectionHeader";

interface PlantDetailsSectionProps {
  details: PlantDetails;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: PlantDetails) => void;
  projects: Project[];
  sites: Site[];
}

export function PlantDetailsSection({
  details,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
  projects,
  sites,
}: PlantDetailsSectionProps) {
  const [formData, setFormData] = useState<PlantDetails>(details);

  // Sync with parent when details change externally
  useEffect(() => {
    setFormData(details);
  }, [details]);

  function updateField<K extends keyof PlantDetails>(
    field: K,
    value: PlantDetails[K]
  ) {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate(updated);
  }

  const isComplete =
    formData.equipmentType.trim() &&
    formData.makeModel.trim() &&
    formData.regoOrId.trim() &&
    formData.operatorName.trim();

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Plant Details"
          icon={
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={isComplete ? undefined : 0}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4 space-y-4">
            {/* Equipment Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Equipment Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.equipmentType}
                onChange={(e) => updateField("equipmentType", e.target.value)}
                disabled={isLocked}
                placeholder="e.g., 30t Excavator, Loader, Dump Truck"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Make & Model */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Make & Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.makeModel}
                onChange={(e) => updateField("makeModel", e.target.value)}
                disabled={isLocked}
                placeholder="e.g., Caterpillar 320D"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Registration / ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Registration / ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.regoOrId}
                onChange={(e) => updateField("regoOrId", e.target.value)}
                disabled={isLocked}
                placeholder="e.g., ABC123 or Plant ID #001"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Operator Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Operator Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.operatorName}
                onChange={(e) => updateField("operatorName", e.target.value)}
                disabled={isLocked}
                placeholder="Full name of operator"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => updateField("date", e.target.value)}
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project
              </label>
              <select
                value={formData.projectId ?? ""}
                onChange={(e) =>
                  updateField(
                    "projectId",
                    e.target.value || null
                  )
                }
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Select a project (optional)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Site Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Site
              </label>
              <select
                value={formData.siteId ?? ""}
                onChange={(e) =>
                  updateField(
                    "siteId",
                    e.target.value || null
                  )
                }
                disabled={isLocked}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Select a site (optional)</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
