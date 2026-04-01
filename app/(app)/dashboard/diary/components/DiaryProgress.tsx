"use client";

import type { SiteDiaryFull } from "@/lib/diary/types";

interface DiaryProgressProps {
  diary: SiteDiaryFull;
}

export function DiaryProgress({ diary }: DiaryProgressProps) {
  // Calculate completion percentage based on scoring criteria
  let score = 0;

  // Weather condition set (+20%)
  if (diary.weather?.conditions) {
    score += 20;
  }

  // At least 1 labour row (+20%)
  if (diary.labor.length > 0) {
    score += 20;
  }

  // At least 1 equipment row (+10%)
  if (diary.equipment.length > 0) {
    score += 10;
  }

  // work_completed text (+20%)
  if (diary.work_completed && diary.work_completed.trim().length > 0) {
    score += 20;
  }

  // Photos added (+10%)
  if (diary.photos.length > 0) {
    score += 10;
  }

  // Notes added (+10%)
  if (diary.notes && diary.notes.trim().length > 0) {
    score += 10;
  }

  // At least 1 issue tracked (+10%)
  if (diary.issues.length > 0) {
    score += 10;
  }

  // Determine color based on completion
  // Amber (incomplete) -> Green (100%)
  const getBarColor = () => {
    if (score === 100) return "bg-emerald-500";
    if (score >= 80) return "bg-emerald-400";
    if (score >= 60) return "bg-amber-400";
    if (score >= 40) return "bg-amber-500";
    return "bg-amber-500";
  };

  const getStatusText = () => {
    if (score === 100) return "Complete";
    if (score >= 80) return "Almost there";
    if (score >= 60) return "Good progress";
    if (score >= 40) return "In progress";
    return "Getting started";
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-700">Diary Completion</p>
        <p className="text-sm font-medium text-slate-600">{score}%</p>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">{getStatusText()}</p>
    </div>
  );
}
