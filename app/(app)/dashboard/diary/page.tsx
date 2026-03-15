"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { getDiaries, createDiary } from "@/lib/diary/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteDiaryWithCounts } from "@/lib/diary/types";
import DiaryListCard from "./components/DiaryListCard";

export default function DiaryListPage() {
  const router = useRouter();
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

  const companyId = summary?.activeMembership?.company_id ?? null;

  const [diaries, setDiaries] = useState<SiteDiaryWithCounts[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setBusy(true);
    getDiaries(companyId)
      .then(setDiaries)
      .catch((err) => setError(err?.message ?? (err instanceof Error ? err.message : "Could not load diaries.")))
      .finally(() => setBusy(false));
  }, [companyId]);

  // Check if today's diary already exists
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayDiary = diaries.find((d) => d.date === todayIso);

  async function handleStartToday() {
    if (!companyId) return;
    if (todayDiary) {
      router.push(`/dashboard/diary/${todayDiary.id}`);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const diary = await createDiary({ company_id: companyId, date: todayIso });
      router.push(`/dashboard/diary/${diary.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create diary.");
      setCreating(false);
    }
  }

  if (wsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Site Diary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daily site records — weather, labour, plant & photos.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Start Today CTA */}
        <button
          type="button"
          onClick={handleStartToday}
          disabled={creating || busy}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-amber-400 text-slate-900 text-base font-bold shadow-lg hover:bg-amber-500 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {creating ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : todayDiary ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          {todayDiary ? "Continue Today's Diary" : "Start Today's Diary"}
        </button>

        {/* Diary list */}
        {busy ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : diaries.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No diaries yet."
            description="Tap 'Start Today's Diary' above to log your first entry."
            className="py-16"
          />
        ) : (
          <div className="space-y-3">
            {diaries.length > 0 && (
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
                Recent entries
              </p>
            )}
            {diaries.map((diary) => (
              <DiaryListCard key={diary.id} diary={diary} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
