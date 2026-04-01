"use client";

import { useState } from "react";
import { updateDiary } from "@/lib/diary/client";
import type { SiteDiaryFull } from "@/lib/diary/types";
import { SectionHeader } from "./SectionHeader";

interface WorkCompletedSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
  saving: Record<string, boolean>;
  setSaving: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function WorkCompletedSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
  saving,
  setSaving,
}: WorkCompletedSectionProps) {
  const [workCompletedValue, setWorkCompletedValue] = useState(diary.work_completed ?? "");

  async function autosave(field: string, updater: () => Promise<SiteDiaryFull>) {
    setSaving((s) => ({ ...s, [field]: true }));
    try {
      const updated = await updater();
      onUpdate(updated);
    } catch (err) {
      console.error("[WorkCompletedSection] autosave error:", err);
    } finally {
      setSaving((s) => ({ ...s, [field]: false }));
    }
  }

  function handleWorkCompletedBlur(value: string) {
    void autosave("work_completed", async () => {
      const updated = await updateDiary(diary.id, { work_completed: value.trim() || null });
      return { ...diary, ...updated };
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Work Completed"
          icon={
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500 mb-2">What was done today — work description, areas covered, milestones reached</p>
          <textarea
            rows={5}
            disabled={isLocked}
            value={workCompletedValue}
            onChange={(e) => setWorkCompletedValue(e.target.value)}
            onBlur={(e) => handleWorkCompletedBlur(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 resize-none disabled:opacity-50"
            placeholder="Describe the work completed today…"
          />
          {saving["work_completed"] && (
            <p className="mt-1 text-xs text-slate-400">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}
