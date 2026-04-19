"use client";

import { BookOpen, Plus, Calendar } from "lucide-react";
import type { SiteDiaryWithCounts } from "@/lib/site-capture/types";

interface TodayDiaryCardProps {
  diaries: SiteDiaryWithCounts[];
  onOpenDiary: (id: string) => void;
  onCreateDiary: () => void;
  loading?: boolean;
}

export function TodayDiaryCard({ diaries, onOpenDiary, onCreateDiary, loading }: TodayDiaryCardProps) {
  const today = new Date().toISOString().slice(0, 10);
  const todayDiary = diaries.find(d => d.date === today && (d as { form_type?: string }).form_type !== 'prestart-checklist');
  
  const todayFormatted = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/20 rounded mb-2" />
        <div className="h-4 w-32 bg-white/20 rounded" />
      </div>
    );
  }

  if (todayDiary) {
    return (
      <button
        onClick={() => onOpenDiary(todayDiary.id)}
        className="w-full group relative overflow-hidden bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sky-100 text-sm font-medium">Today&apos;s Diary</p>
              <p className="text-white text-lg font-bold">{todayFormatted}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sky-100 text-sm">Open diary</span>
            <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onCreateDiary}
      className="w-full group relative overflow-hidden bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
    >
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sky-100 text-sm font-medium">Start Today&apos;s Diary</p>
            <p className="text-white text-lg font-bold">{todayFormatted}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sky-100 text-sm">Create new</span>
          <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}
