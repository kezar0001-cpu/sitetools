"use client";

import { useState, useCallback } from "react";
import type { ToolboxTalkFull, ToolboxTalkData, SiteDiaryPhoto } from "@/lib/site-capture/types";
import { updateToolboxTalkData } from "@/lib/site-capture/client";
import { TalkDetailsSection } from "./TalkDetailsSection";
import { ContentSection } from "./ContentSection";
import { AttendeesSection } from "./AttendeesSection";
import { ActionsSection } from "./ActionsSection";
import { SignOffSection } from "./SignOffSection";
import { PhotosSection } from "./PhotosSection";
import { CompleteExportPanel } from "./CompleteExportPanel";
import { ToolboxProgress } from "./ToolboxProgress";

interface Props {
  diary: ToolboxTalkFull;
  onUpdate?: (updated: ToolboxTalkFull) => void;
  userId?: string | null;
}

type Section = "talkDetails" | "content" | "attendees" | "actions" | "photos" | "signOff";

export default function ToolboxEntryForm({ diary: initialDiary, onUpdate, userId }: Props) {
  const [diary, setDiary] = useState<ToolboxTalkFull>(initialDiary);
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["talkDetails", "content", "attendees"] as Section[])
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const isLocked = diary.status === "completed" || diary.status === "archived";

  const handleSectionUpdate = useCallback((updated: ToolboxTalkFull) => {
    setDiary(updated);
    onUpdate?.(updated);
  }, [onUpdate]);

  const handleTalkDataUpdate = useCallback(async (data: Partial<ToolboxTalkData>) => {
    setSaving((prev) => ({ ...prev, talkDetails: true }));
    setSaveError(null);
    try {
      const updatedData = await updateToolboxTalkData(diary.id, data);
      const updated = { ...diary, toolbox_talk_data: updatedData };
      setDiary(updated);
      onUpdate?.(updated);
    } catch (err) {
      console.error("Failed to update talk details:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving((prev) => ({ ...prev, talkDetails: false }));
    }
  }, [diary, onUpdate]);

  const handlePhotosUpdate = useCallback((photos: SiteDiaryPhoto[]) => {
    const updated = { ...diary, photos };
    setDiary(updated);
    onUpdate?.(updated);
  }, [diary, onUpdate]);

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
      {/* Progress Bar */}
      <ToolboxProgress diary={diary} />

      {saveError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Talk Details */}
      <TalkDetailsSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("talkDetails")}
        onToggle={() => toggleSection("talkDetails")}
        onUpdate={handleTalkDataUpdate}
        saving={saving.talkDetails}
      />

      {/* Content */}
      <ContentSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("content")}
        onToggle={() => toggleSection("content")}
        onUpdate={handleTalkDataUpdate}
      />

      {/* Attendees */}
      <AttendeesSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("attendees")}
        onToggle={() => toggleSection("attendees")}
        onUpdate={handleSectionUpdate}
      />

      {/* Photos */}
      {openSections.has("photos") && (
        <PhotosSection
          diary={diary}
          isLocked={isLocked}
          isOpen={openSections.has("photos")}
          onToggle={() => toggleSection("photos")}
          onUpdate={handlePhotosUpdate}
        />
      )}

      {/* Actions */}
      <ActionsSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("actions")}
        onToggle={() => toggleSection("actions")}
        onUpdate={handleSectionUpdate}
      />

      {/* Sign Off */}
      <SignOffSection
        diary={diary}
        isLocked={isLocked}
        isOpen={openSections.has("signOff")}
        onToggle={() => toggleSection("signOff")}
        onUpdate={handleTalkDataUpdate}
        userId={userId}
      />

      {/* Add Optional Sections */}
      {!isLocked && !openSections.has("photos") && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-600 mb-3">Add optional sections</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleSection("photos")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Photos
            </button>
          </div>
        </div>
      )}

      {/* Complete & Export Panel */}
      <CompleteExportPanel
        diary={diary}
        onUpdate={handleSectionUpdate}
      />
    </div>
  );
}
