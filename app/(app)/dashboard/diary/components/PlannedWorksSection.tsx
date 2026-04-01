"use client";

import { useState } from "react";
import { updateDiary } from "@/lib/diary/client";
import type { SiteDiaryFull } from "@/lib/diary/types";
import { SectionHeader } from "./SectionHeader";

interface PlannedWorksSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
  saving: Record<string, boolean>;
  setSaving: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function PlannedWorksSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
  saving,
  setSaving,
}: PlannedWorksSectionProps) {
  const [plannedWorksValue, setPlannedWorksValue] = useState(diary.planned_works ?? "");

  async function autosave(field: string, updater: () => Promise<SiteDiaryFull>) {
    setSaving((s) => ({ ...s, [field]: true }));
    try {
      const updated = await updater();
      onUpdate(updated);
    } catch (err) {
      console.error("[PlannedWorksSection] autosave error:", err);
    } finally {
      setSaving((s) => ({ ...s, [field]: false }));
    }
  }

  function handlePlannedWorksBlur(value: string) {
    void autosave("planned_works", async () => {
      const updated = await updateDiary(diary.id, { planned_works: value.trim() || null });
      return { ...diary, ...updated };
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Planned Works"
          icon={
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500 mb-2">What&apos;s planned for tomorrow — activities, plant needed, hold points</p>
          <textarea
            rows={5}
            disabled={isLocked}
            value={plannedWorksValue}
            onChange={(e) => setPlannedWorksValue(e.target.value)}
            onBlur={(e) => handlePlannedWorksBlur(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none disabled:opacity-50"
            placeholder="Describe the planned work for tomorrow…"
          />
          {saving["planned_works"] && (
            <p className="mt-1 text-xs text-slate-400">Saving…</p>
          )}
        </div>
      )}
    </div>
  );
}
