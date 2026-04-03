"use client";

import { useState, useEffect } from "react";
import { SectionHeader } from "./SectionHeader";
import type { SiteDiaryFull } from "@/lib/site-capture/types";
import { PhotoUploader } from "./PhotoUploader";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type IncidentType = "Injury" | "Near Miss" | "Property Damage" | "Environmental" | "Dangerous Occurrence";

export interface IncidentDetails {
  incidentType: IncidentType | null;
  date: string;
  time: string;
  exactLocation: string;
  projectId: string | null;
  siteId: string | null;
  reportedBy: string;
  description: string;
  photosRequired: boolean;
}

const INCIDENT_TYPES: IncidentType[] = [
  "Injury",
  "Near Miss",
  "Property Damage",
  "Environmental",
  "Dangerous Occurrence",
];

const INCIDENT_TYPE_COLORS: Record<IncidentType, { bg: string; border: string; text: string }> = {
  Injury: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  "Near Miss": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  "Property Damage": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  Environmental: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  "Dangerous Occurrence": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
};

interface IncidentDetailsSectionProps {
  diary: SiteDiaryFull;
  details: IncidentDetails;
  onUpdate: (details: IncidentDetails) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  saving?: Record<string, boolean>;
  setSaving?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  projects?: Array<{ id: string; name: string }>;
  sites?: Array<{ id: string; name: string }>;
}

export function IncidentDetailsSection({
  diary,
  details,
  onUpdate,
  isLocked,
  isOpen,
  onToggle,
  projects = [],
  sites = [],
}: IncidentDetailsSectionProps) {
  const [localDetails, setLocalDetails] = useState<IncidentDetails>(details);
  const [improving, setImproving] = useState(false);

  const { isListening, transcript, isSupported: voiceSupported, startListening, stopListening } = useVoiceToText();

  // Check if photos are required based on incident type
  const photosRequired = localDetails.incidentType === "Injury" || localDetails.incidentType === "Property Damage";

  useEffect(() => {
    setLocalDetails(details);
  }, [details]);

  // Apply voice transcript to description
  useEffect(() => {
    if (transcript && !isLocked) {
      setLocalDetails((prev) => ({ ...prev, description: transcript }));
    }
  }, [transcript, isLocked]);

  function handleUpdate(updates: Partial<IncidentDetails>) {
    const newDetails = { ...localDetails, ...updates };
    setLocalDetails(newDetails);
    onUpdate(newDetails);
  }

  async function handleImproveWithAI() {
    if (!localDetails.description.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    setImproving(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/diary-improve-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          text: localDetails.description,
          context: `Incident Report - ${localDetails.incidentType || "Incident"}`,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to improve text");
      }

      const data = await res.json() as { text: string };
      handleUpdate({ description: data.text });
      toast.success("Text improved with AI");
    } catch (err) {
      console.error("[IncidentDetailsSection] AI improvement error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to improve text");
    } finally {
      setImproving(false);
    }
  }

  const hasPhotos = diary.photos && diary.photos.length > 0;
  const showPhotoWarning = photosRequired && !hasPhotos && !isLocked;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Incident Details"
          icon={
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4 space-y-4">
            {/* Incident Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Incident Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INCIDENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => !isLocked && handleUpdate({ incidentType: type })}
                    disabled={isLocked}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors text-left ${
                      localDetails.incidentType === type
                        ? `${INCIDENT_TYPE_COLORS[type].bg} ${INCIDENT_TYPE_COLORS[type].border} ${INCIDENT_TYPE_COLORS[type].text}`
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={localDetails.date}
                  onChange={(e) => handleUpdate({ date: e.target.value })}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={localDetails.time}
                  onChange={(e) => handleUpdate({ time: e.target.value })}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Exact Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Exact Location on Site <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localDetails.exactLocation}
                onChange={(e) => handleUpdate({ exactLocation: e.target.value })}
                disabled={isLocked}
                placeholder="e.g., Building A, Level 2, North side"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-60"
              />
            </div>

            {/* Project and Site */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Project</label>
                <select
                  value={localDetails.projectId || ""}
                  onChange={(e) => handleUpdate({ projectId: e.target.value || null })}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-60"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site</label>
                <select
                  value={localDetails.siteId || ""}
                  onChange={(e) => handleUpdate({ siteId: e.target.value || null })}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-60"
                >
                  <option value="">Select site...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reported By */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reported By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localDetails.reportedBy}
                onChange={(e) => handleUpdate({ reportedBy: e.target.value })}
                disabled={isLocked}
                placeholder="Full name of person reporting"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-60"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description of What Happened <span className="text-red-500">*</span>
              </label>

              {/* Voice input and AI buttons */}
              <div className="flex items-center gap-2 mb-3">
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={improving || isLocked}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                      isListening
                        ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    } ${improving || isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isListening ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Voice Input
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleImproveWithAI}
                  disabled={improving || !localDetails.description.trim() || isLocked}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                    improving
                      ? "bg-violet-100 text-violet-700"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {improving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Improving…
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      ✦ Improve with AI
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={4}
                value={localDetails.description}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                disabled={isLocked}
                placeholder="Provide a detailed description of the incident..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none disabled:opacity-60"
              />
            </div>

            {/* Photo Upload Warning */}
            {showPhotoWarning && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Photos Required
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {localDetails.incidentType} incidents require photo documentation. Please upload photos in the Photos section.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
