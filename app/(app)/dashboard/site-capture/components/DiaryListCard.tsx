"use client";

import Link from "next/link";
import {
  DIARY_STATUS_BADGE,
  DIARY_STATUS_LABELS,
  WEATHER_CONDITION_ICONS,
  WEATHER_CONDITION_LABELS,
  FORM_TYPE_CONFIG,
  FORM_TYPE_BADGE,
} from "@/lib/site-capture/types";
import type { SiteDiaryWithCounts, FormType } from "@/lib/site-capture/types";

interface Props {
  diary: SiteDiaryWithCounts;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00"); // force local timezone parse
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DiaryListCard({ diary }: Props) {
  const weatherIcon = WEATHER_CONDITION_ICONS[diary.weather?.conditions] ?? "🌤️";
  const weatherLabel = WEATHER_CONDITION_LABELS[diary.weather?.conditions] ?? "—";
  const statusLabel = DIARY_STATUS_LABELS[diary.status] ?? diary.status;
  const statusBadge = DIARY_STATUS_BADGE[diary.status] ?? "bg-slate-100 text-slate-500 border-slate-200";
  
  // Form type badge - default to daily-diary for backwards compatibility
  const formType: FormType = (diary as { form_type?: FormType }).form_type ?? "daily-diary";
  const formTypeConfig = FORM_TYPE_CONFIG[formType];
  const formTypeBadge = FORM_TYPE_BADGE[formType] ?? "bg-slate-100 text-slate-600 border-slate-200";
  
  const isArchived = diary.status === "archived";

  return (
    <Link href={`/dashboard/site-capture/${diary.id}`}>
      <div className={`group flex items-start gap-4 rounded-2xl bg-white border p-4 shadow-sm hover:border-amber-400 hover:shadow-md active:scale-[0.99] transition-all duration-150 cursor-pointer ${
        isArchived ? "border-slate-200 opacity-75" : "border-slate-200"
      }`}>
        {/* Date block */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-100 rounded-xl w-14 h-14 group-hover:bg-amber-50 transition-colors">
          <span className="text-xs font-medium text-slate-500 leading-none">
            {new Date(diary.date + "T00:00:00").toLocaleDateString("en-AU", { month: "short" }).toUpperCase()}
          </span>
          <span className="text-2xl font-bold text-slate-800 leading-none mt-0.5">
            {new Date(diary.date + "T00:00:00").getDate()}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {formatDate(diary.date)}
              </p>
              {/* Form type badge */}
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${formTypeBadge}`}
                title={formTypeConfig?.description}
              >
                {formTypeConfig?.label ?? "Daily Diary"}
              </span>
            </div>
            {/* Status badge */}
            <span
              className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge}`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Weather */}
            <span className="inline-flex items-center gap-1 text-sm text-slate-600">
              <span aria-hidden>{weatherIcon}</span>
              <span>{weatherLabel}</span>
              {diary.weather?.temp_max != null && (
                <span className="text-slate-400">
                  {diary.weather.temp_max}°C
                </span>
              )}
            </span>

            {/* Workers */}
            <span className="inline-flex items-center gap-1 text-sm text-slate-600">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-4M9 20H4v-2a4 4 0 015-4m4-4a4 4 0 110-8 4 4 0 010 8zm6 4a2 2 0 11-4 0 2 2 0 014 0zM5 16a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">{diary.total_workers ?? 0}</span>
              <span className="text-slate-400">workers</span>
            </span>

            {/* Equipment */}
            {diary.total_equipment_rows > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{diary.total_equipment_rows}</span>
                <span className="text-slate-400">plant</span>
              </span>
            )}

            {/* Photos */}
            {diary.total_photos > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{diary.total_photos}</span>
                <span className="text-slate-400">photos</span>
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 self-center text-slate-300 group-hover:text-amber-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
