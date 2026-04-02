"use client";

import { useState, useEffect } from "react";
import { updateDiary } from "@/lib/diary/client";
import type { SiteDiaryFull } from "@/lib/diary/types";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { SectionHeader } from "./SectionHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  const [improving, setImproving] = useState(false);

  const { isListening, transcript, isSupported: voiceSupported, error: voiceError, startListening, stopListening } = useVoiceToText();

  // Apply voice transcript to planned works
  useEffect(() => {
    if (transcript && !isLocked) {
      setPlannedWorksValue(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

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

  async function handleImproveWithAI() {
    if (!plannedWorksValue.trim()) {
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
          text: plannedWorksValue,
          context: "Planned Works"
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to improve text");
      }

      const data = await res.json() as { text: string };
      setPlannedWorksValue(data.text);
      
      // Auto-save the improved text
      await autosave("planned_works", async () => {
        const updated = await updateDiary(diary.id, { planned_works: data.text.trim() || null });
        return { ...diary, ...updated };
      });
      
      toast.success("Text improved with AI");
    } catch (err) {
      console.error("[PlannedWorksSection] AI improvement error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to improve text");
    } finally {
      setImproving(false);
    }
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
          
          {/* Voice input and AI buttons */}
          <div className="flex items-center gap-2 mb-3">
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={improving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  isListening
                    ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
                    : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                } ${improving ? "opacity-50 cursor-not-allowed" : ""}`}
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

            {/* AI Improve button */}
            <button
              type="button"
              onClick={handleImproveWithAI}
              disabled={improving || !plannedWorksValue.trim()}
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

            {voiceError && (
              <span className="text-xs text-red-600">{voiceError}</span>
            )}
            {isListening && (
              <span className="text-xs text-indigo-600 animate-pulse">Listening...</span>
            )}
          </div>

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
