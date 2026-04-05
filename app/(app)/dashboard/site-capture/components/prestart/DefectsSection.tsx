"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import type { ChecklistDefect, DefectSeverity } from "@/lib/site-capture/types";
import { SectionHeader } from "../SectionHeader";

interface DefectsSectionProps {
  defects: ChecklistDefect[];
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (defects: ChecklistDefect[]) => void;
  onPhotoUpload?: (file: File) => Promise<string>; // returns storage path
}

const SEVERITY_OPTIONS: { value: DefectSeverity; label: string; color: string }[] = [
  { value: "minor", label: "Minor", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "major", label: "Major", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700 border-red-300" },
];

function getSeverityColor(severity: DefectSeverity): string {
  switch (severity) {
    case "minor":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "major":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "critical":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-300";
  }
}

export function DefectsSection({
  defects,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
  onPhotoUpload,
}: DefectsSectionProps) {
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateDefect(
    defectId: string,
    updates: Partial<ChecklistDefect>
  ) {
    const updated = defects.map((d) =>
      d.id === defectId ? { ...d, ...updates } : d
    );
    onUpdate(updated);
  }

  async function handlePhotoUpload(defectId: string, file: File) {
    if (!onPhotoUpload) return;
    setUploadingPhotoId(defectId);
    try {
      const storagePath = await onPhotoUpload(file);
      const defect = defects.find((d) => d.id === defectId);
      if (defect) {
        updateDefect(defectId, {
          photos: [...defect.photos, storagePath],
        });
      }
    } catch (err) {
      console.error("Failed to upload photo:", err);
    } finally {
      setUploadingPhotoId(null);
    }
  }

  function handleFileChange(defectId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(defectId, file);
    }
  }

  function removePhoto(defectId: string, photoIndex: number) {
    const defect = defects.find((d) => d.id === defectId);
    if (defect) {
      updateDefect(defectId, {
        photos: defect.photos.filter((_, i) => i !== photoIndex),
      });
    }
  }

  const unclearedCriticalCount = defects.filter(
    (d) => d.severity === "critical" && !d.clearedBeforeOperation
  ).length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Defects & Issues"
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={defects.length > 0 ? defects.length : undefined}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Warning banner for uncleared critical defects */}
          {unclearedCriticalCount > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Critical Safety Issue{unclearedCriticalCount !== 1 ? "s" : ""} Detected
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {unclearedCriticalCount} critical defect
                    {unclearedCriticalCount !== 1 ? "s" : ""} must be cleared before
                    operation can proceed. This equipment cannot be used until
                    resolved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {defects.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 text-center py-4">
              No defects recorded. Mark checklist items as &quot;Fail&quot; to add defects.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {defects.map((defect) => (
                <div
                  key={defect.id}
                  className={`rounded-xl border p-4 space-y-4 ${
                    defect.severity === "critical" && !defect.clearedBeforeOperation
                      ? "border-red-300 bg-red-50/50"
                      : "border-slate-200"
                  }`}
                >
                  {/* Defect Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 break-words">
                        {defect.description}
                      </p>
                    </div>
                    {/* Severity selector */}
                    <div className="flex-shrink-0">
                      <select
                        value={defect.severity}
                        onChange={(e) =>
                          updateDefect(defect.id, {
                            severity: e.target.value as DefectSeverity,
                          })
                        }
                        disabled={isLocked}
                        className={`text-xs font-medium rounded-lg px-2 py-1 border focus:outline-none focus:ring-2 ${getSeverityColor(
                          defect.severity
                        )} disabled:opacity-50`}
                      >
                        {SEVERITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {defect.photos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 group"
                        >
                          <Image
                            src={photo}
                            alt={`Defect photo ${idx + 1}`}
                            fill
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => removePhoto(defect.id, idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Remove photo"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {!isLocked && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(defect.id, e)}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhotoId === defect.id}
                            className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
                          >
                            {uploadingPhotoId === defect.id ? (
                              <svg
                                className="w-5 h-5 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cleared before operation checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={defect.clearedBeforeOperation}
                      onChange={(e) =>
                        updateDefect(defect.id, {
                          clearedBeforeOperation: e.target.checked,
                        })
                      }
                      disabled={isLocked}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-slate-700">
                      This defect has been cleared before operation
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
