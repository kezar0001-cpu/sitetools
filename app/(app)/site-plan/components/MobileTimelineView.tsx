"use client";

import { useMemo, useRef } from "react";
import type { SitePlanTaskNode } from "@/types/siteplan";

interface MobileTimelineViewProps {
  rows: SitePlanTaskNode[];
  onSelectTask: (task: SitePlanTaskNode) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(dateInput: Date | string) {
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(from: Date | string, to: Date | string) {
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);
  return Math.floor((toDay.getTime() - fromDay.getTime()) / DAY_MS);
}

export function MobileTimelineView({ rows, onSelectTask }: MobileTimelineViewProps) {
  const windowStart = useRef(startOfDay(new Date())).current;

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(windowStart);
      date.setDate(windowStart.getDate() + index);
      return date;
    });
  }, [windowStart]);

  const windowEnd = days[days.length - 1];
  const todayCol = diffDays(windowStart, startOfDay(new Date()));

  const activeTasks = useMemo(() => {
    return rows
      .filter((task) => {
        if (task.children.length > 0) return false;
        if (task.status !== "in_progress" && task.status !== "not_started") return false;
        const start = startOfDay(task.start_date);
        const end = startOfDay(task.end_date);
        return end >= windowStart && start <= windowEnd;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [rows, windowStart, windowEnd]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="border-b border-slate-200 px-3 py-2">
        <p className="text-xs font-semibold text-slate-700">Timeline · Next 14 days</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom)+16px)]">
        <div className="relative min-w-[680px]">
          <div
            className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns: "120px repeat(14, minmax(40px, 1fr))" }}
          >
            <div className="border-r border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Active tasks
            </div>
            {days.map((day) => {
              const isToday = day.getTime() === windowStart.getTime();
              return (
                <div
                  key={day.toISOString()}
                  className={`border-r border-slate-200 px-1 py-2 text-center text-[10px] ${
                    isToday ? "bg-blue-50 text-blue-700" : "text-slate-500"
                  }`}
                >
                  <p className="font-semibold">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                  <p>{day.getDate()}</p>
                </div>
              );
            })}
          </div>
          {todayCol >= 0 && todayCol <= 13 && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-[2px] bg-blue-400 opacity-60"
              style={{ left: `calc(${(todayCol / 13) * 100}% + 120px)` }}
            />
          )}

          {activeTasks.map((task) => {
            const clampedStart = Math.max(diffDays(windowStart, task.start_date), 0);
            const clampedEnd = Math.min(diffDays(windowStart, task.end_date), 13);
            if (clampedEnd < clampedStart) return null;
            const left = (clampedStart / 13) * 100;
            const width = Math.max(2, ((clampedEnd - clampedStart) / 13) * 100);
            const colorClass = task.status === "in_progress" ? "bg-blue-500" : "bg-slate-400";

            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task)}
                className="grid w-full border-b border-slate-100 text-left transition active:bg-slate-50"
                style={{ gridTemplateColumns: "120px repeat(14, minmax(40px, 1fr))" }}
              >
                <div className="truncate border-r border-slate-200 px-3 py-3 text-sm text-slate-800">
                  {task.name}
                </div>
                <div className="relative col-span-14 grid grid-cols-14 items-center">
                  {days.map((day) => (
                    <div key={`${task.id}-${day.toISOString()}`} className="h-full border-r border-slate-100" />
                  ))}
                  <div
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div className={`relative h-2 rounded-full ${colorClass}`}>
                      <span className={`absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${colorClass}`} />
                      <span className={`absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${colorClass}`} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {activeTasks.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No active tasks in the next 14 days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
