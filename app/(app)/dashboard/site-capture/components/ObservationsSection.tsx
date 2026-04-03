"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";
import type {
  SiteDiaryFull,
  InspectionObservation,
} from "@/lib/site-capture/types";

interface ObservationsSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  observations: InspectionObservation[];
  onObservationsChange: (observations: InspectionObservation[]) => void;
}

export function ObservationsSection({
  isLocked,
  isOpen,
  onToggle,
  observations,
  onObservationsChange,
}: ObservationsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newObservation, setNewObservation] = useState<Partial<InspectionObservation>>({
    description: "",
    reference: "",
    priority: "medium",
    action_required: "",
    assigned_to: "",
    due_date: "",
  });

  const addObservation = () => {
    if (!newObservation.description?.trim()) return;
    const observation: InspectionObservation = {
      id: `temp-${Date.now()}`,
      diary_id: "",
      inspection_item_id: null,
      description: newObservation.description.trim(),
      reference: newObservation.reference?.trim() || null,
      priority: (newObservation.priority as "low" | "medium" | "high") || "medium",
      action_required: newObservation.action_required?.trim() || null,
      assigned_to: newObservation.assigned_to?.trim() || null,
      due_date: newObservation.due_date || null,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      completed_by: null,
    };
    onObservationsChange([...observations, observation]);
    setNewObservation({
      description: "",
      reference: "",
      priority: "medium",
      action_required: "",
      assigned_to: "",
      due_date: "",
    });
    setIsAdding(false);
  };

  const removeObservation = (id: string) => {
    onObservationsChange(observations.filter((o) => o.id !== id));
  };

  const updateObservation = (id: string, updates: Partial<InspectionObservation>) => {
    onObservationsChange(
      observations.map((o) => (o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o))
    );
  };

  const openCount = observations.filter((o) => o.status !== "completed" && o.status !== "closed").length;

  const priorityBadge = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Observations"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={observations.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          {/* Summary */}
          {observations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${openCount > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {openCount} Open
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {observations.filter((o) => o.priority === "high").length} High Priority
              </span>
            </div>
          )}

          {/* Observations list */}
          <div className="space-y-3">
            {observations.map((obs) => (
              <div key={obs.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {obs.priority && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${priorityBadge(obs.priority)}`}
                        >
                          {obs.priority.charAt(0).toUpperCase() + obs.priority.slice(1)}
                        </span>
                      )}
                      {obs.status === "completed" || obs.status === "closed" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          Open
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-2">{obs.description}</p>
                    {obs.reference && <p className="text-xs text-slate-500 mt-0.5">Ref: {obs.reference}</p>}
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => removeObservation(obs.id)}
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
                      value={obs.action_required || ""}
                      onChange={(e) => updateObservation(obs.id, { action_required: e.target.value || null })}
                      placeholder="Action required"
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                    <input
                      type="text"
                      value={obs.assigned_to || ""}
                      onChange={(e) => updateObservation(obs.id, { assigned_to: e.target.value || null })}
                      placeholder="Assigned to"
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                    <input
                      type="date"
                      value={obs.due_date || ""}
                      onChange={(e) => updateObservation(obs.id, { due_date: e.target.value || null })}
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                    <select
                      value={obs.priority || "medium"}
                      onChange={(e) => updateObservation(obs.id, { priority: e.target.value as "low" | "medium" | "high" })}
                      className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                )}

                {isLocked && (obs.action_required || obs.assigned_to || obs.due_date) && (
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    {obs.action_required && <p>Action: {obs.action_required}</p>}
                    {obs.assigned_to && <p>Assigned: {obs.assigned_to}</p>}
                    {obs.due_date && <p>Due: {new Date(obs.due_date).toLocaleDateString()}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new observation */}
          {!isLocked && (
            <div className="mt-4">
              {!isAdding ? (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add observation
                  </span>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
                  <input
                    type="text"
                    value={newObservation.description}
                    onChange={(e) => setNewObservation({ ...newObservation, description: e.target.value })}
                    placeholder="Observation description *"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={newObservation.reference}
                    onChange={(e) => setNewObservation({ ...newObservation, reference: e.target.value })}
                    placeholder="Reference (optional)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newObservation.priority}
                      onChange={(e) => setNewObservation({ ...newObservation, priority: e.target.value as "low" | "medium" | "high" })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <input
                      type="date"
                      value={newObservation.due_date}
                      onChange={(e) => setNewObservation({ ...newObservation, due_date: e.target.value })}
                      placeholder="Due date"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={newObservation.action_required}
                    onChange={(e) => setNewObservation({ ...newObservation, action_required: e.target.value })}
                    placeholder="Action required"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={newObservation.assigned_to}
                    onChange={(e) => setNewObservation({ ...newObservation, assigned_to: e.target.value })}
                    placeholder="Assigned to"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addObservation}
                      disabled={!newObservation.description?.trim()}
                      className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Observation
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

          {observations.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <p className="text-sm">No observations recorded</p>
              <p className="text-xs text-slate-400 mt-1">Observations are auto-populated from Observation items or added manually</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
