"use client";

import { useState, useCallback, useEffect } from "react";
import type { SiteDiaryFull, SiteDiaryLabor, SiteDiaryEquipment } from "@/lib/site-capture/types";
import type { CompanyRole } from "@/lib/workspace/types";
import { useFormAutoSave } from "@/hooks/useFormAutoSave";
import { WeatherSection } from "./WeatherSection";
import { WorkCompletedSection } from "./WorkCompletedSection";
import { PlannedWorksSection } from "./PlannedWorksSection";
import { LabourSection } from "./LabourSection";
import { EquipmentSection } from "./EquipmentSection";
import { PhotosSection } from "./PhotosSection";
import { NotesSection } from "./NotesSection";
import { CompleteExportPanel } from "./CompleteExportPanel";
import { DiaryProgress } from "./DiaryProgress";
import { IssuesSection } from "./IssuesSection";

interface Props {
  diary: SiteDiaryFull;
  onUpdate?: (updated: SiteDiaryFull) => void;
  userRole?: CompanyRole | null;
  userId?: string | null;
}

type Section = "weather" | "work_completed" | "planned_works" | "labor" | "equipment" | "photos" | "notes" | "issues";
type OptionalSection = "equipment" | "photos" | "notes" | "issues";

export default function DiaryEntryForm({ diary: initialDiary, onUpdate }: Props) {
  const [diary, setDiary] = useState<SiteDiaryFull>(initialDiary);
  // Essential sections open by default - these are needed daily
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["weather", "work_completed", "planned_works", "labor"] as Section[])
  );
  // Optional sections - only shown when user adds them (not needed daily)
  const [visibleOptional, setVisibleOptional] = useState<Set<OptionalSection>>(() => {
    // Auto-show optional sections if they already have content
    const visible = new Set<OptionalSection>();
    if ((initialDiary.photos?.length ?? 0) > 0) visible.add("photos");
    if ((initialDiary.notes?.trim() ?? "").length > 0) visible.add("notes");
    if ((initialDiary.issues?.length ?? 0) > 0) visible.add("issues");
    return visible;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Derived state
  const isLocked = diary.status === "completed" || diary.status === "archived";

  // Wrapper for section updates that syncs local diary state
  const handleSectionUpdate = useCallback((updated: SiteDiaryFull) => {
    setDiary(updated);
    onUpdate?.(updated);
  }, [onUpdate]);

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  function addOptionalSection(section: OptionalSection) {
    setVisibleOptional((prev) => new Set(Array.from(prev).concat(section)));
    // Also open the section when adding it
    setOpenSections((prev) => new Set(Array.from(prev).concat(section)));
  }

  // ── Draft Auto-Save ──
  // Extract draftable values (exclude photos which are already persisted)
  const draftValues = {
    weather: diary.weather,
    work_completed: diary.work_completed,
    planned_works: diary.planned_works,
    labor: diary.labor,
    equipment: diary.equipment,
    notes: diary.notes,
    issues: diary.issues,
    visibleOptional: Array.from(visibleOptional),
    openSections: Array.from(openSections),
  };

  const {
    showRecoveryDialog,
    restoreDraft,
    clearDraft,
    dismissDraft,
    draftTimestamp,
  } = useFormAutoSave({
    key: `${diary.id}:${diary.date}`,
    formType: "daily-diary",
    userId: diary.created_by ?? null,
    diaryId: diary.id,
    values: draftValues,
    enabled: !isLocked,
  });

  // Handle draft restoration
  const handleRestoreDraft = useCallback(() => {
    const draft = restoreDraft();
    if (draft) {
      // Restore visible sections
      if (draft.visibleOptional) {
        setVisibleOptional(new Set(draft.visibleOptional as OptionalSection[]));
      }
      if (draft.openSections) {
        setOpenSections(new Set(draft.openSections as Section[]));
      }

      // Restore diary values
      const restoredDiary: SiteDiaryFull = {
        ...diary,
        weather: draft.weather ?? diary.weather,
        work_completed: draft.work_completed ?? diary.work_completed,
        planned_works: draft.planned_works ?? diary.planned_works,
        labor: draft.labor as SiteDiaryLabor[] ?? diary.labor,
        equipment: draft.equipment as SiteDiaryEquipment[] ?? diary.equipment,
        notes: draft.notes ?? diary.notes,
        issues: draft.issues ?? diary.issues,
      };

      setDiary(restoredDiary);
      onUpdate?.(restoredDiary);
    }
  }, [restoreDraft, diary, onUpdate]);

  // Clear draft when diary is completed
  useEffect(() => {
    if (diary.status === "completed") {
      clearDraft();
    }
  }, [diary.status, clearDraft]);

  // Format timestamp for display
  const formattedDraftTime = draftTimestamp
    ? new Date(draftTimestamp).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-1">
      {/* ── Draft Recovery Dialog ── */}
      {showRecoveryDialog && formattedDraftTime && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-900">
                Unsaved draft found from {formattedDraftTime}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                You have unsaved changes that weren&apos;t submitted. Would you like to restore them?
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleRestoreDraft}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  Restore Draft
                </button>
                <button
                  onClick={dismissDraft}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Progress Bar ── */}
      <DiaryProgress diary={diary} />

      {/* ── Weather ── */}
      <WeatherSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("weather")}
        onToggle={() => toggleSection("weather")}
        onUpdate={handleSectionUpdate}
        saving={saving}
        setSaving={setSaving}
      />

      {/* ── Work Completed ── */}
      <WorkCompletedSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("work_completed")}
        onToggle={() => toggleSection("work_completed")}
        onUpdate={handleSectionUpdate}
        saving={saving}
        setSaving={setSaving}
      />

      {/* ── Planned Works ── */}
      <PlannedWorksSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("planned_works")}
        onToggle={() => toggleSection("planned_works")}
        onUpdate={handleSectionUpdate}
        saving={saving}
        setSaving={setSaving}
      />

      {/* ── Labour ── */}
      <LabourSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("labor")}
        onToggle={() => toggleSection("labor")}
        onUpdate={handleSectionUpdate}
      />

      {/* ── Equipment (Optional) ── */}
      {visibleOptional.has("equipment") && (
        <EquipmentSection
          diary={diary}
          isLocked={isLocked}
          isOpen={openSections.has("equipment")}
          onToggle={() => toggleSection("equipment")}
          onUpdate={handleSectionUpdate}
        />
      )}

      {/* ── Photos (Optional) ── */}
      {visibleOptional.has("photos") && (
        <PhotosSection
          diary={diary}
          isLocked={isLocked}
          isOpen={openSections.has("photos")}
          onToggle={() => toggleSection("photos")}
          onUpdate={handleSectionUpdate}
        />
      )}

      {/* ── Notes (Optional) ── */}
      {visibleOptional.has("notes") && (
        <NotesSection
          diary={diary}
          isLocked={isLocked}
          isOpen={openSections.has("notes")}
          onToggle={() => toggleSection("notes")}
          onUpdate={handleSectionUpdate}
          saving={saving}
          setSaving={setSaving}
        />
      )}

      {/* ── Issues (Optional) ── */}
      {visibleOptional.has("issues") && (
        <IssuesSection
          diary={diary}
          isLocked={isLocked}
          isOpen={openSections.has("issues")}
          onToggle={() => toggleSection("issues")}
          onUpdate={handleSectionUpdate}
        />
      )}

      {/* ── Add Optional Sections ── */}
      {!isLocked && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-600 mb-3">Add optional sections</p>
          <div className="flex flex-wrap gap-2">
            {!visibleOptional.has("equipment") && (
              <button
                type="button"
                onClick={() => addOptionalSection("equipment")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Equipment
              </button>
            )}
            {!visibleOptional.has("photos") && (
              <button
                type="button"
                onClick={() => addOptionalSection("photos")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Photos
              </button>
            )}
            {!visibleOptional.has("notes") && (
              <button
                type="button"
                onClick={() => addOptionalSection("notes")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Notes
              </button>
            )}
            {!visibleOptional.has("issues") && (
              <button
                type="button"
                onClick={() => addOptionalSection("issues")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Issues
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Complete & Export Panel ── */}
      <CompleteExportPanel
        diary={diary}
        onUpdate={handleSectionUpdate}
      />
    </div>
  );
}
