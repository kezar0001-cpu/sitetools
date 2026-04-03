"use client";

import { useCallback, useEffect, useMemo } from "react";
import { SectionHeader } from "./SectionHeader";
import {
  INSPECTION_OUTCOMES,
  INSPECTION_OUTCOME_BADGES,
} from "@/lib/site-capture/types";
import type { SiteDiaryFull, InspectionOutcomeData } from "@/lib/site-capture/types";

interface OutcomeSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  outcome: InspectionOutcomeData | null;
  onOutcomeChange: (outcome: InspectionOutcomeData) => void;
  failCount?: number;
}

export function OutcomeSection({
  isLocked,
  isOpen,
  onToggle,
  outcome,
  onOutcomeChange,
  failCount = 0,
}: OutcomeSectionProps) {
  // Use useMemo to stabilize safeOutcome and prevent dependency churn
  const safeOutcome = useMemo(
    () =>
      outcome || {
        result: "Approved",
        comments: "",
        re_inspection_trigger: false,
        next_inspection_type: null,
        next_inspection_due_date: null,
      },
    [outcome]
  );

  const updateField = useCallback(
    <K extends keyof InspectionOutcomeData>(key: K, value: InspectionOutcomeData[K]) => {
      onOutcomeChange({ ...safeOutcome, [key]: value });
    },
    [safeOutcome, onOutcomeChange]
  );

  // Auto-suggest re-inspection based on failures
  useEffect(() => {
    if (failCount > 0 && safeOutcome.result === "Approved") {
      updateField("result", "Re-inspection Required");
      updateField("re_inspection_trigger", true);
    }
  }, [failCount, safeOutcome.result, updateField]);

  const requiresFollowUp =
    safeOutcome.result === "Not Approved" || safeOutcome.result === "Re-inspection Required";

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Inspection Outcome"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={safeOutcome.result}
          badgeClass={INSPECTION_OUTCOME_BADGES[safeOutcome.result]}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Outcome selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Overall Result</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INSPECTION_OUTCOMES.map((result) => (
                <button
                  key={result}
                  onClick={() => {
                    if (!isLocked) {
                      updateField("result", result);
                      updateField("re_inspection_trigger", result === "Not Approved" || result === "Re-inspection Required");
                    }
                  }}
                  disabled={isLocked}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    safeOutcome.result === result
                      ? INSPECTION_OUTCOME_BADGES[result]
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {result}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Overall Comments</label>
            <textarea
              value={safeOutcome.comments || ""}
              onChange={(e) => updateField("comments", e.target.value)}
              disabled={isLocked}
              rows={3}
              placeholder="Enter any overall comments about the inspection..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Follow-up inspection (conditional) */}
          {requiresFollowUp && (
            <div className="p-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-slate-800">Follow-up Inspection Required</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Next Inspection Type</label>
                  <select
                    value={safeOutcome.next_inspection_type || ""}
                    onChange={(e) => updateField("next_inspection_type", e.target.value || null)}
                    disabled={isLocked}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  >
                    <option value="">Select type...</option>
                    <option value="pre-pour">Pre-pour</option>
                    <option value="post-pour">Post-pour</option>
                    <option value="frame">Frame</option>
                    <option value="lockup">Lock-up</option>
                    <option value="waterproofing">Waterproofing</option>
                    <option value="final">Final</option>
                    <option value="practical-completion">Practical Completion</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={safeOutcome.next_inspection_due_date || ""}
                    onChange={(e) => updateField("next_inspection_due_date", e.target.value || null)}
                    disabled={isLocked}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                {failCount > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
                    {failCount} failed {failCount === 1 ? "item" : "items"} will need to be re-inspected.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Approval summary */}
          {safeOutcome.result === "Approved" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-emerald-800 font-medium">Inspection approved - no follow-up required</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
