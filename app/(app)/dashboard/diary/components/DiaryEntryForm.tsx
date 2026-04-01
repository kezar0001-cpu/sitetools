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
import { ReviewPanel } from "./ReviewPanel";

interface Props {
  diary: SiteDiaryFull;
  onUpdate?: (updated: SiteDiaryFull) => void;
  userRole?: CompanyRole | null;
  userId?: string | null;
}

type Section = "weather" | "work_completed" | "planned_works" | "labor" | "equipment" | "photos" | "notes";

export default function DiaryEntryForm({ diary: initialDiary, onUpdate, userRole }: Props) {
  const [diary, setDiary] = useState<SiteDiaryFull>(initialDiary);
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["weather", "work_completed", "planned_works", "labor"] as Section[])
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Derived state
  const isLocked = diary.status === "submitted" || diary.status === "approved";
  const isRejected = diary.status === "rejected";

  // Auto-save helper (exposed to children via onUpdate callback pattern)
  async function autosave(field: string, updater: () => Promise<SiteDiaryFull>) {
    setSaving((s) => ({ ...s, [field]: true }));
    try {
      const updated = await updater();
      setDiary(updated);
      onUpdate?.(updated);
    } catch (err) {
      console.error("[DiaryEntryForm] autosave error:", err);
    } finally {
      setSaving((s) => ({ ...s, [field]: false }));
    }
  }

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

  return (
    <div className="space-y-1">
      {/* ── Rejection notice (shown to author when diary was rejected) ── */}
      {isRejected && diary.rejection_note && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Changes requested</p>
          <p className="text-sm text-red-600 whitespace-pre-wrap">{diary.rejection_note}</p>
          <p className="mt-2 text-xs text-red-500">
            Address the feedback above, then resubmit for review.
          </p>
        </div>
      )}

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

      {/* ── Equipment ── */}
      <EquipmentSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("equipment")}
        onToggle={() => toggleSection("equipment")}
        onUpdate={handleSectionUpdate}
      />

      {/* ── Photos ── */}
      <PhotosSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("photos")}
        onToggle={() => toggleSection("photos")}
        onUpdate={handleSectionUpdate}
      />

      {/* ── Notes ── */}
      <NotesSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("notes")}
        onToggle={() => toggleSection("notes")}
        onUpdate={handleSectionUpdate}
        saving={saving}
        setSaving={setSaving}
      />

      {/* ── Review Panel (Submit/Approve/Reject) ── */}
      <ReviewPanel
        diary={diary}
        userRole={userRole}
        onUpdate={handleSectionUpdate}
      />
    </div>
  );
}
