"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";
import {
  INSPECTION_SEVERITIES,
  INSPECTION_SEVERITY_BADGES,
} from "@/lib/site-capture/types";
import type { SiteDiaryFull, InspectionDefect, InspectionSeverity } from "@/lib/site-capture/types";

interface DefectsFoundSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  defects: InspectionDefect[];
  onDefectsChange: (defects: InspectionDefect[]) => void;
  onAddDefectFromFail?: (itemId: string, description: string) => void;
}

export function DefectsFoundSection({
  isLocked,
  isOpen,
  onToggle,
  defects,
  onDefectsChange,
}: DefectsFoundSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDefect, setNewDefect] = useState<Partial<InspectionDefect>>({
    description: "",
    location: "",
    severity: "minor",
    rectification_required: "",
    assigned_to: "",
    due_date: "",
  });

  const addDefect = () => {
    if (!newDefect.description?.trim()) return;
    const defect: InspectionDefect = {
      id: `temp-${Date.now()}`,
      diary_id: "",
      inspection_item_id: null,
      description: newDefect.description.trim(),
      location: newDefect.location?.trim() || null,
      severity: (newDefect.severity as InspectionSeverity) || "minor",
      photo_paths: [],
      rectification_required: newDefect.rectification_required?.trim() || null,
      assigned_to: newDefect.assigned_to?.trim() || null,
      due_date: newDefect.due_date || null,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      completed_by: null,
    };
    onDefectsChange([...defects, defect]);
    setNewDefect({
      description: "",
      location: "",
      severity: "minor",
      rectification_required: "",
      assigned_to: "",
      due_date: "",
    });
    setIsAdding(false);
  };

  const removeDefect = (id: string) => {
    onDefectsChange(defects.filter((d) => d.id !== id));
  };

  const updateDefect = (id: string, updates: Partial<InspectionDefect>) => {
    onDefectsChange(
      defects.map((d) => (d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d))
    );
  };

  const openCount = defects.filter((d) => d.status === "open" || d.status === "in_progress").length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Defects Found"
          icon={
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={defects.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          {/* Summary */}
          {defects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${openCount > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {openCount} Open
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {defects.filter((d) => d.severity === "critical").length} Critical
              </span>
            </div>
          )}

          {/* Defects list */}
          <div className="space-y-3">
            {defects.map((defect) => (
              <div
                key={defect.id}
                className={`p-3 rounded-xl border ${
                  defect.severity === "critical"
                    ? "border-red-300 bg-red-50"
                    : defect.severity === "major"
                    ? "border-orange-200 bg-orange-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          INSPECTION_SEVERITY_BADGES[defect.severity]
                        }`}
                      >
                        {defect.severity.charAt(0).toUpperCase() + defect.severity.slice(1)}
                      </span>
                      {defect.status === "completed" || defect.status === "verified" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          Open
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-2">{defect.description}</p>
                    {defect.location && <p className="text-xs text-slate-500 mt-0.5">Location: {defect.location}</p>}
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => removeDefect(defect.id)}
                      className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Editable fields */}
                {!isLocked && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={defect.rectification_required || ""}
                      onChange={(e) => updateDefect(defect.id, { rectification_required: e.target.value || null })}
                      placeholder="Rectification required"
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    />
                    <input
                      type="text"
                      value={defect.assigned_to || ""}
                      onChange={(e) => updateDefect(defect.id, { assigned_to: e.target.value || null })}
                      placeholder="Assigned to"
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    />
                    <input
                      type="date"
                      value={defect.due_date || ""}
                      onChange={(e) => updateDefect(defect.id, { due_date: e.target.value || null })}
                      placeholder="Due date"
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    />
                    <select
                      value={defect.severity}
                      onChange={(e) => updateDefect(defect.id, { severity: e.target.value as InspectionSeverity })}
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    >
                      {INSPECTION_SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isLocked && (defect.rectification_required || defect.assigned_to || defect.due_date) && (
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    {defect.rectification_required && <p>Rectification: {defect.rectification_required}</p>}
                    {defect.assigned_to && <p>Assigned: {defect.assigned_to}</p>}
                    {defect.due_date && <p>Due: {new Date(defect.due_date).toLocaleDateString()}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new defect */}
          {!isLocked && (
            <div className="mt-4">
              {!isAdding ? (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add defect manually
                  </span>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 space-y-3">
                  <input
                    type="text"
                    value={newDefect.description ?? ""}
                    onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                    placeholder="Defect description *"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                  />
                  <input
                    type="text"
                    value={newDefect.location ?? ""}
                    onChange={(e) => setNewDefect({ ...newDefect, location: e.target.value })}
                    placeholder="Location"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newDefect.severity ?? "minor"}
                      onChange={(e) => setNewDefect({ ...newDefect, severity: e.target.value as InspectionSeverity })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    >
                      {INSPECTION_SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newDefect.due_date ?? ""}
                      onChange={(e) => setNewDefect({ ...newDefect, due_date: e.target.value })}
                      placeholder="Due date"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={newDefect.rectification_required ?? ""}
                    onChange={(e) => setNewDefect({ ...newDefect, rectification_required: e.target.value })}
                    placeholder="Rectification required"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                  />
                  <input
                    type="text"
                    value={newDefect.assigned_to ?? ""}
                    onChange={(e) => setNewDefect({ ...newDefect, assigned_to: e.target.value })}
                    placeholder="Assigned to"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addDefect}
                      disabled={!newDefect.description?.trim()}
                      className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Defect
                    </button>
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {defects.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <p className="text-sm">No defects recorded</p>
              <p className="text-xs text-slate-400 mt-1">Defects are auto-populated from Fail items or added manually</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
