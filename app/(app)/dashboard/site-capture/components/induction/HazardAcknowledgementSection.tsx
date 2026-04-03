"use client";

import { useState, useCallback } from "react";
import { SectionHeader } from "../SectionHeader";
import type { HazardItem } from "@/lib/site-capture/induction-types";
import { getHazardProgress } from "@/lib/site-capture/induction-types";

interface HazardAcknowledgementSectionProps {
  hazards: HazardItem[];
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (hazards: HazardItem[]) => void;
}

export function HazardAcknowledgementSection({
  hazards,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: HazardAcknowledgementSectionProps) {
  const [localHazards, setLocalHazards] = useState(hazards);

  // Sync with parent when hazards change externally
  const handleToggle = useCallback(
    (index: number) => {
      if (isLocked) return;
      
      const updated = localHazards.map((hazard, i) =>
        i === index
          ? {
              ...hazard,
              acknowledged: !hazard.acknowledged,
              acknowledgedAt: !hazard.acknowledged ? new Date().toISOString() : null,
            }
          : hazard
      );
      
      setLocalHazards(updated);
      onUpdate(updated);
    },
    [localHazards, onUpdate, isLocked]
  );

  const progress = getHazardProgress(hazards);
  const progressPercent = progress.total > 0 ? (progress.acknowledged / progress.total) * 100 : 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Hazard Acknowledgement"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={progress.acknowledged < progress.total ? progress.total - progress.acknowledged : undefined}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Progress: {progress.acknowledged} of {progress.total} acknowledged
              </span>
              <span className={`font-semibold ${progress.acknowledged === progress.total ? "text-emerald-600" : "text-amber-600"}`}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.acknowledged === progress.total ? "bg-emerald-500" : "bg-amber-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Hazards List */}
          <div className="space-y-3">
            {localHazards.map((hazard, index) => (
              <div
                key={hazard.id}
                className={`p-4 rounded-xl border transition-colors ${
                  hazard.acknowledged
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-slate-200 hover:border-amber-300"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-shrink-0 pt-0.5">
                    <input
                      type="checkbox"
                      checked={hazard.acknowledged}
                      onChange={() => handleToggle(index)}
                      disabled={isLocked}
                      className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{hazard.name}</span>
                      {hazard.acknowledged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{hazard.description}</p>
                    {hazard.acknowledged && hazard.acknowledgedAt && (
                      <p className="text-xs text-emerald-600 mt-2">
                        Acknowledged at {new Date(hazard.acknowledgedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Warning if not all acknowledged */}
          {progress.acknowledged < progress.total && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800">
                All hazards must be acknowledged before completing the induction.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
