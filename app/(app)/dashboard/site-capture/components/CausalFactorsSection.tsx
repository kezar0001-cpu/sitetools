"use client";

import { SectionHeader } from "./SectionHeader";

export type CausalFactor =
  | "procedureNotFollowed"
  | "inadequateTraining"
  | "equipmentFailure"
  | "environmentalConditions"
  | "fatigue"
  | "communicationFailure"
  | "other";

export interface CausalFactorsData {
  factors: CausalFactor[];
  otherDetails: string;
}

const CAUSAL_FACTOR_OPTIONS: { id: CausalFactor; label: string }[] = [
  { id: "procedureNotFollowed", label: "Procedure not followed" },
  { id: "inadequateTraining", label: "Inadequate training" },
  { id: "equipmentFailure", label: "Equipment failure" },
  { id: "environmentalConditions", label: "Environmental conditions" },
  { id: "fatigue", label: "Fatigue" },
  { id: "communicationFailure", label: "Communication failure" },
  { id: "other", label: "Other" },
];

interface CausalFactorsSectionProps {
  data: CausalFactorsData;
  onUpdate: (data: CausalFactorsData) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function CausalFactorsSection({
  data,
  onUpdate,
  isLocked,
  isOpen,
  onToggle,
}: CausalFactorsSectionProps) {
  const selectedCount = data.factors.length;

  function toggleFactor(factor: CausalFactor) {
    if (isLocked) return;

    const newFactors = data.factors.includes(factor)
      ? data.factors.filter((f) => f !== factor)
      : [...data.factors, factor];

    onUpdate({ ...data, factors: newFactors });
  }

  function handleOtherDetailsChange(details: string) {
    if (isLocked) return;
    onUpdate({ ...data, otherDetails: details });
  }

  const showOtherField = data.factors.includes("other");

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Causal Factors"
          icon={
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={selectedCount > 0 ? selectedCount : undefined}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4">
            <p className="text-sm text-slate-600 mb-3">
              Select all contributing factors that apply:
            </p>

            <div className="space-y-2">
              {CAUSAL_FACTOR_OPTIONS.map((option) => {
                const isSelected = data.factors.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleFactor(option.id)}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      isSelected
                        ? "bg-purple-50 border-purple-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-purple-600 border-purple-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? "text-purple-900" : "text-slate-700"}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Other Details Field */}
            {showOtherField && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Other Details
                </label>
                <textarea
                  rows={3}
                  value={data.otherDetails}
                  onChange={(e) => handleOtherDetailsChange(e.target.value)}
                  disabled={isLocked}
                  placeholder="Please specify other contributing factors..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none disabled:opacity-60"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
