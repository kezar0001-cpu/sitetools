"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { SitePlanTask } from "@/types/siteplan";
import { buildTaskTree, flattenTree } from "@/types/siteplan";

const ROW_HEIGHT = 40;
const DAY_WIDTH = 32;
const LEFT_WIDTH_KEY = "siteplan-left-panel-width";
const MIN_LEFT_WIDTH = 200;

interface GanttWrapperProps {
  tasks: SitePlanTask[];
  onTaskClick?: (task: SitePlanTask) => void;
}

export function GanttWrapper({ tasks, onTaskClick }: GanttWrapperProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const sharedScrollTopRef = useRef(0);
  const isSyncingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [leftWidth, setLeftWidth] = useState(360);

  const flatTasks = useMemo(() => flattenTree(buildTaskTree(tasks)), [tasks]);

  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const visit = (task: SitePlanTask, depth: number) => {
      map.set(task.id, depth);
      flatTasks.filter((t) => t.parent_id === task.id).forEach((c) => visit(c, depth + 1));
    };
    flatTasks.filter((t) => !t.parent_id).forEach((t) => visit(t, 0));
    return map;
  }, [flatTasks]);

  useEffect(() => {
    const raw = window.localStorage.getItem(LEFT_WIDTH_KEY);
    const stored = raw ? Number(raw) : NaN;
    if (Number.isFinite(stored)) setLeftWidth(Math.max(MIN_LEFT_WIDTH, stored));
  }, []);

  const range = useMemo(() => {
    if (flatTasks.length === 0) {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return { start: now, end };
    }
    const starts = flatTasks.map((t) => new Date(t.start_date).getTime());
    const ends = flatTasks.map((t) => new Date(t.end_date).getTime());
    const start = new Date(Math.min(...starts));
    const end = new Date(Math.max(...ends));
    start.setDate(start.getDate() - 3);
    end.setDate(end.getDate() + 3);
    return { start, end };
  }, [flatTasks]);

  const dayColumns = useMemo(() => {
    const cols: Date[] = [];
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(range.end);
    end.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      cols.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return cols;
  }, [range]);

  const timelineWidth = dayColumns.length * DAY_WIDTH;

  const syncScroll = useCallback((source: "left" | "right") => {
    if (isSyncingRef.current) return;
    const sourceEl = source === "left" ? leftScrollRef.current : rightScrollRef.current;
    const targetEl = source === "left" ? rightScrollRef.current : leftScrollRef.current;
    if (!sourceEl || !targetEl) return;
    const nextTop = sourceEl.scrollTop;
    sharedScrollTopRef.current = nextTop;
    isSyncingRef.current = true;
    targetEl.scrollTop = nextTop;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, []);

  const updateLeftWidth = useCallback((clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = Math.floor(Math.min(window.innerWidth * 0.6, rect.width - 200));
    const next = Math.max(MIN_LEFT_WIDTH, Math.min(clientX - rect.left, maxLeft));
    setLeftWidth(next);
    window.localStorage.setItem(LEFT_WIDTH_KEY, String(next));
  }, []);

  const startResize = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizing(true);

    const onMove = (e: MouseEvent) => updateLeftWidth(e.clientX);
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [updateLeftWidth]);

  if (flatTasks.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-400">Add tasks to see the timeline.</div>;
  }

  return (
    <div ref={rootRef} className={`flex h-full min-h-0 w-full ${isResizing ? "cursor-col-resize" : ""}`}>
      <div className="min-w-0 border-r border-slate-200" style={{ width: leftWidth }}>
        <div ref={leftScrollRef} onScroll={() => syncScroll("left")} className="h-full overflow-x-auto overflow-y-auto">
          <div className="min-w-[700px]">
            <div className="sticky top-0 z-20 grid grid-cols-[90px_minmax(260px,1fr)_120px_120px_80px] border-b border-slate-200 bg-white text-xs font-semibold text-slate-600">
              <div className="px-3 py-2">WBS</div>
              <div className="px-3 py-2">Task</div>
              <div className="px-3 py-2">Start</div>
              <div className="px-3 py-2">Finish</div>
              <div className="px-3 py-2 text-right">%</div>
            </div>
            {flatTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="grid w-full grid-cols-[90px_minmax(260px,1fr)_120px_120px_80px] border-b border-slate-100 text-left text-sm hover:bg-slate-50"
                style={{ height: ROW_HEIGHT }}
              >
                <div className="px-3 py-2 text-slate-500">{task.wbs_code}</div>
                <div className="truncate px-3 py-2 text-slate-800" style={{ paddingLeft: 12 + (depthMap.get(task.id) ?? 0) * 16 }}>
                  {task.name}
                </div>
                <div className="px-3 py-2 text-slate-500">{task.start_date}</div>
                <div className="px-3 py-2 text-slate-500">{task.end_date}</div>
                <div className="px-3 py-2 text-right text-slate-700">{task.progress}%</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        onMouseDown={startResize}
        className="w-1 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-blue-400"
        title="Drag to resize"
      />

      <div className="min-w-0 flex-1">
        <div ref={rightScrollRef} onScroll={() => syncScroll("right")} className="h-full overflow-x-auto overflow-y-auto">
          <div style={{ width: timelineWidth }}>
            <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white text-xs font-medium text-slate-500">
              {dayColumns.map((day) => (
                <div key={day.toISOString()} className="border-r border-slate-100 px-1 py-2 text-center" style={{ width: DAY_WIDTH }}>
                  {day.getDate()}
                </div>
              ))}
            </div>
            {flatTasks.map((task) => {
              const start = new Date(task.start_date);
              const end = new Date(task.end_date);
              const startOffsetDays = Math.floor((start.getTime() - range.start.getTime()) / 86400000);
              const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
              const left = startOffsetDays * DAY_WIDTH;
              const width = durationDays * DAY_WIDTH;

              return (
                <div key={task.id} className="relative border-b border-slate-100" style={{ height: ROW_HEIGHT }}>
                  <div className="absolute inset-y-0" style={{ left, width }}>
                    <button
                      onClick={() => onTaskClick?.(task)}
                      className="mt-2 h-6 w-full rounded bg-blue-500/80 hover:bg-blue-600"
                      title={task.name}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
