"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDiaryById, getDiaryPhotoUrls } from "@/lib/diary/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteDiaryFull } from "@/lib/diary/types";
import { WEATHER_CONDITION_ICONS, DIARY_STATUS_LABELS, DIARY_STATUS_BADGE } from "@/lib/diary/types";
import DiaryEntryForm from "../components/DiaryEntryForm";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DiaryDetailPage() {
  const { diaryId } = useParams<{ diaryId: string }>();
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

  const userRole = summary?.activeMembership?.role ?? null;
  const userId = summary?.userId ?? null;

  const [diary, setDiary] = useState<SiteDiaryFull | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!diaryId) return;
    setBusy(true);

    getDiaryById(diaryId)
      .then(async (data) => {
        if (!data) {
          setError("Diary not found.");
          return;
        }
        // Load diary content first so the page renders immediately,
        // then fetch fresh 7-day signed URLs for photos via the Edge Function.
        setDiary(data);
        const photos = await getDiaryPhotoUrls(diaryId);
        setDiary((prev) => prev ? { ...prev, photos } : prev);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load diary."))
      .finally(() => setBusy(false));
  }, [diaryId]);

  if (wsLoading || busy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">⚠️</div>
        <p className="text-slate-600 text-center">{error ?? "Diary not found."}</p>
        <Link
          href="/dashboard/diary"
          className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 text-slate-900 font-semibold hover:bg-amber-500 transition-colors"
        >
          Back to diaries
        </Link>
      </div>
    );
  }

  const weatherIcon =
    diary.weather?.conditions ? WEATHER_CONDITION_ICONS[diary.weather.conditions] ?? "🌤️" : "🌤️";

  const statusLabel = DIARY_STATUS_LABELS[diary.status] ?? diary.status;
  const statusBadge = DIARY_STATUS_BADGE[diary.status] ?? "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 pb-24">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pt-4 pb-3 -mx-4 px-4 border-b border-slate-200/80 mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/diary"
              className="flex-shrink-0 p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>{weatherIcon}</span>
                <h1 className="text-base font-bold text-slate-900 truncate">
                  {formatDate(diary.date)}
                </h1>
              </div>
            </div>
            {/* Status badge */}
            <span
              className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* The entry form */}
        <DiaryEntryForm
          diary={diary}
          onUpdate={setDiary}
          userRole={userRole}
          userId={userId}
        />
      </div>
    </div>
  );
}
