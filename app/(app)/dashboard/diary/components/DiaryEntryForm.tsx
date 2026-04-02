"use client";

import { useState, useCallback } from "react";
import type { SiteDiaryFull } from "@/lib/diary/types";
import type { CompanyRole } from "@/lib/workspace/types";
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
  const isDraft = diary.status === "draft";

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

  return (
    <div className="space-y-1">
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
