"use client";

import { useState, useEffect } from "react";
import { updateDiary } from "@/lib/diary/client";
import type { SiteDiaryFull } from "@/lib/diary/types";
import { useVoiceToText } from "@/hooks/useVoiceToText";
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

  const { isListening, transcript, isSupported: voiceSupported, error: voiceError, startListening, stopListening } = useVoiceToText();

  // Apply voice transcript to work description
  useEffect(() => {
    if (transcript && !isLocked) {
      setWorkCompletedValue(transcript);
    }
  }, [transcript, isLocked]);

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
          {!isLocked && (
            <form onSubmit={(e) => e.preventDefault()} className="mt-4 space-y-3">
              {/* Voice input button */}
              {voiceSupported && (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                      isListening
                        ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
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
                  {voiceError && (
                    <span className="text-xs text-red-600">{voiceError}</span>
                  )}
                  {isListening && (
                    <span className="text-xs text-indigo-600 animate-pulse">Listening...</span>
                  )}
                </div>
              )}

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
            </form>
          )}
        </div>
      )}
    </div>
  );
}
