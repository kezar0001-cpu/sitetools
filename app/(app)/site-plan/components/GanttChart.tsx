"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  Calendar,
  X,
  AlertTriangle,
} from "lucide-react";
import type {
  SitePlanTask,
  SitePlanTaskNode,
  SitePlanDelayLog,
  TaskStatus,
} from "@/types/siteplan";
import {
  buildTaskTree,
  flattenTree,
} from "@/types/siteplan";
import { StatusBadge } from "./StatusBadge";

// ─── Types ──────────────────────────────────────────────────

type ZoomLevel = "day" | "week" | "month" | "quarter";
type ViewFilter = "programme" | "today";

interface GanttChartProps {
  tasks: SitePlanTask[];
  baselines?: SitePlanTask[];
  delayLogs?: SitePlanDelayLog[];
  showDependencies?: boolean;
  onTaskClick?: (task: SitePlanTask) => void;
  onDoubleClick?: (task: SitePlanTask) => void;
  onDateChange?: (task: SitePlanTask, start_date: string, end_date: string) => void;
  onLogDelay?: (task: SitePlanTask) => void;
  canEdit?: boolean;
}

// ─── Constants ──────────────────────────────────────────────

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 50;
const LEFT_PANEL_WIDTH_DESKTOP = 520;
const LEFT_PANEL_WIDTH_MOBILE = 160;

const STATUS_BAR_COLORS: Record<TaskStatus, { bg: string; progress: string }> = {
  not_started: { bg: "#cbd5e1", progress: "#94a3b8" },
  in_progress: { bg: "#93c5fd", progress: "#3b82f6" },
  completed: { bg: "#86efac", progress: "#22c55e" },
  delayed: { bg: "#fca5a5", progress: "#ef4444" },
  on_hold: { bg: "#fcd34d", progress: "#f59e0b" },
};

const ZOOM_COLUMN_WIDTH: Record<ZoomLevel, number> = {
  day: 40,
  week: 120,
  month: 200,
  quarter: 300,
};

// ─── Date helpers ───────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay() + 1); // Monday
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const qMonth = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), qMonth, 1);
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric" });
}

function formatQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

// ─── Timescale generation ───────────────────────────────────

interface TimeColumn {
  date: Date;
  label: string;
  width: number;
  x: number;
}

interface TimeHeader {
  label: string;
  x: number;
  width: number;
}

function generateTimescale(
  rangeStart: Date,
  rangeEnd: Date,
  zoom: ZoomLevel,
  colWidth: number
): { columns: TimeColumn[]; topHeaders: TimeHeader[] } {
  const columns: TimeColumn[] = [];
  const topHeaders: TimeHeader[] = [];
  let x = 0;

  if (zoom === "day") {
    let cursor = new Date(rangeStart);
    let currentMonth = "";
    let monthStart = 0;
    while (cursor <= rangeEnd) {
      const monthLabel = formatMonth(cursor);
      if (monthLabel !== currentMonth) {
        if (currentMonth) {
          topHeaders.push({ label: currentMonth, x: monthStart, width: x - monthStart });
        }
        currentMonth = monthLabel;
        monthStart = x;
      }
      columns.push({ date: new Date(cursor), label: formatDay(cursor), width: colWidth, x });
      x += colWidth;
      cursor = addDays(cursor, 1);
    }
    if (currentMonth) {
      topHeaders.push({ label: currentMonth, x: monthStart, width: x - monthStart });
    }
  } else if (zoom === "week") {
    let cursor = startOfWeek(new Date(rangeStart));
    let currentMonth = "";
    let monthStart = 0;
    while (cursor <= rangeEnd) {
      const monthLabel = formatMonth(cursor);
      if (monthLabel !== currentMonth) {
        if (currentMonth) {
          topHeaders.push({ label: currentMonth, x: monthStart, width: x - monthStart });
        }
        currentMonth = monthLabel;
        monthStart = x;
      }
      columns.push({ date: new Date(cursor), label: formatWeek(cursor), width: colWidth, x });
      x += colWidth;
      cursor = addDays(cursor, 7);
    }
    if (currentMonth) {
      topHeaders.push({ label: currentMonth, x: monthStart, width: x - monthStart });
    }
  } else if (zoom === "month") {
    let cursor = startOfMonth(new Date(rangeStart));
    let currentYear = "";
    let yearStart = 0;
    while (cursor <= rangeEnd) {
      const yearLabel = String(cursor.getFullYear());
      if (yearLabel !== currentYear) {
        if (currentYear) {
          topHeaders.push({ label: currentYear, x: yearStart, width: x - yearStart });
        }
        currentYear = yearLabel;
        yearStart = x;
      }
      columns.push({ date: new Date(cursor), label: formatMonth(cursor), width: colWidth, x });
      x += colWidth;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    if (currentYear) {
      topHeaders.push({ label: currentYear, x: yearStart, width: x - yearStart });
    }
  } else {
    // quarter
    let cursor = startOfQuarter(new Date(rangeStart));
    let currentYear = "";
    let yearStart = 0;
    while (cursor <= rangeEnd) {
      const yearLabel = String(cursor.getFullYear());
      if (yearLabel !== currentYear) {
        if (currentYear) {
          topHeaders.push({ label: currentYear, x: yearStart, width: x - yearStart });
        }
        currentYear = yearLabel;
        yearStart = x;
      }
      columns.push({ date: new Date(cursor), label: formatQuarter(cursor), width: colWidth, x });
      x += colWidth;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1);
    }
    if (currentYear) {
      topHeaders.push({ label: currentYear, x: yearStart, width: x - yearStart });
    }
  }

  return { columns, topHeaders };
}

// ─── Bar position calculation ───────────────────────────────

function getBarX(
  taskDate: Date,
  rangeStart: Date,
  totalDays: number,
  totalWidth: number
): number {
  const days = daysBetween(rangeStart, taskDate);
  return (days / totalDays) * totalWidth;
}

// ─── Main component ─────────────────────────────────────────

export function GanttChart({
  tasks,
  baselines,
  delayLogs,
  showDependencies: initialShowDeps = true,
  onTaskClick,
  onDoubleClick,
  onDateChange,
  onLogDelay,
  canEdit = true,
}: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("programme");
  const [showDeps, setShowDeps] = useState(initialShowDeps);
  const [selectedBar, setSelectedBar] = useState<SitePlanTask | null>(null);
  const [expandedPhases] = useState<Set<string>>(new Set());
  const [allExpanded] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

  // Build delay count map
  const delayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (delayLogs) {
      for (const log of delayLogs) {
        map.set(log.task_id, (map.get(log.task_id) ?? 0) + 1);
      }
    }
    return map;
  }, [delayLogs]);

  // Build delay days map (total impacting days per task)
  const delayDaysMap = useMemo(() => {
    const map = new Map<string, number>();
    if (delayLogs) {
      for (const log of delayLogs) {
        if (log.impacts_completion) {
          map.set(log.task_id, (map.get(log.task_id) ?? 0) + log.delay_days);
        }
      }
    }
    return map;
  }, [delayLogs]);

  // Build baseline map
  const baselineMap = useMemo(() => {
    const map = new Map<string, SitePlanTask>();
    if (baselines) {
      for (const t of baselines) map.set(t.id, t);
    }
    return map;
  }, [baselines]);

  // Build tree and flatten
  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const flatTasks = useMemo(() => {
    const flat = flattenTree(tree);

    // Apply view filter
    if (viewFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return flat.filter((t) => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        // Active today or overdue
        return (start <= today && end >= today) || (end < today && t.progress < 100);
      });
    }

    // Apply expand/collapse for phases
    if (allExpanded) return flat;
    const result: SitePlanTaskNode[] = [];
    const collapsedParents = new Set<string>();
    for (const node of flat) {
      if (collapsedParents.has(node.parent_id ?? "")) {
        collapsedParents.add(node.id);
        continue;
      }
      result.push(node);
      if (node.type === "phase" && !expandedPhases.has(node.id)) {
        collapsedParents.add(node.id);
      }
    }
    return result;
  }, [tree, viewFilter, allExpanded, expandedPhases]);

  // Date range (padded by 7 days on each side)
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return {
        rangeStart: addDays(now, -7),
        rangeEnd: addDays(now, 37),
        totalDays: 44,
      };
    }
    const starts = tasks.map((t) => new Date(t.start_date).getTime());
    const ends = tasks.map((t) => new Date(t.end_date).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    const s = addDays(min, -7);
    const e = addDays(max, 14);
    return { rangeStart: s, rangeEnd: e, totalDays: daysBetween(s, e) };
  }, [tasks]);

  const colWidth = ZOOM_COLUMN_WIDTH[zoom];
  const { columns, topHeaders } = useMemo(
    () => generateTimescale(rangeStart, rangeEnd, zoom, colWidth),
    [rangeStart, rangeEnd, zoom, colWidth]
  );

  const totalTimelineWidth = columns.length > 0
    ? columns[columns.length - 1].x + columns[columns.length - 1].width
    : 800;

  const svgHeight = flatTasks.length * ROW_HEIGHT;

  // Today marker position
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayX = getBarX(today, rangeStart, totalDays, totalTimelineWidth);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (timelineRef.current) {
      const containerWidth = timelineRef.current.clientWidth;
      timelineRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 2);
    }
  }, [todayX]);

  // Sync vertical scroll between task list and timeline
  const handleTimelineScroll = useCallback(() => {
    if (timelineRef.current && taskListRef.current) {
      taskListRef.current.scrollTop = timelineRef.current.scrollTop;
    }
  }, []);

  const handleTaskListScroll = useCallback(() => {
    if (timelineRef.current && taskListRef.current) {
      timelineRef.current.scrollTop = taskListRef.current.scrollTop;
    }
  }, []);

  // Initial scroll to today
  useEffect(() => {
    const timer = setTimeout(scrollToToday, 100);
    return () => clearTimeout(timer);
  }, [scrollToToday]);

  // Pinch-to-zoom on mobile
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    let initialPinchDistance = 0;
    let startZoom = zoom;
    const zoomOrder: ZoomLevel[] = ["day", "week", "month", "quarter"];

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        startZoom = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const ratio = currentDistance / initialPinchDistance;

        const currentIdx = zoomOrder.indexOf(startZoom);
        if (ratio > 1.5 && currentIdx > 0) {
          setZoom(zoomOrder[currentIdx - 1]);
          initialPinchDistance = currentDistance;
          startZoom = zoomOrder[currentIdx - 1];
        } else if (ratio < 0.67 && currentIdx < zoomOrder.length - 1) {
          setZoom(zoomOrder[currentIdx + 1]);
          initialPinchDistance = currentDistance;
          startZoom = zoomOrder[currentIdx + 1];
        }
        e.preventDefault();
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [zoom]);

  // Drag state for interactive bar resizing
  const [dragState, setDragState] = useState<{
    task: SitePlanTask;
    mode: "move" | "resize-end";
    startX: number;
    origStartDate: Date;
    origEndDate: Date;
    currentStartDate: Date;
    currentEndDate: Date;
  } | null>(null);

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent, task: SitePlanTask, mode: "move" | "resize-end") => {
      if (!canEdit || task.type === "phase" || task.type === "milestone") return;
      e.stopPropagation();
      e.preventDefault();
      setDragState({
        task,
        mode,
        startX: e.clientX,
        origStartDate: new Date(task.start_date),
        origEndDate: new Date(task.end_date),
        currentStartDate: new Date(task.start_date),
        currentEndDate: new Date(task.end_date),
      });
    },
    [canEdit]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const pxPerDay = totalTimelineWidth / totalDays;
      const daysDelta = Math.round(dx / pxPerDay);

      if (dragState.mode === "move") {
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                currentStartDate: addDays(prev.origStartDate, daysDelta),
                currentEndDate: addDays(prev.origEndDate, daysDelta),
              }
            : prev
        );
      } else {
        // resize-end: only move end date, keep at least 1 day duration
        setDragState((prev) => {
          if (!prev) return prev;
          const newEnd = addDays(prev.origEndDate, daysDelta);
          if (newEnd <= prev.origStartDate) return prev;
          return { ...prev, currentEndDate: newEnd };
        });
      }
    };

    const handleMouseUp = () => {
      if (dragState) {
        const fmt = (d: Date) => d.toISOString().split("T")[0];
        const newStart = fmt(dragState.currentStartDate);
        const newEnd = fmt(dragState.currentEndDate);
        const origStart = fmt(dragState.origStartDate);
        const origEnd = fmt(dragState.origEndDate);

        if (newStart !== origStart || newEnd !== origEnd) {
          onDateChange?.(dragState.task, newStart, newEnd);
        }
      }
      setDragState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, totalTimelineWidth, totalDays, onDateChange]);

  // Bar click handler
  const handleBarClick = (task: SitePlanTask) => {
    setSelectedBar(task);
  };

  // Bar double-click handler
  const handleBarDoubleClick = (task: SitePlanTask) => {
    onDoubleClick?.(task);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white flex-wrap">
        {/* Zoom controls */}
        <span className="text-xs font-medium text-slate-500">Zoom:</span>
        <div className="flex items-center border border-slate-200 rounded-md">
          {(["day", "week", "month", "quarter"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1.5 text-xs font-medium capitalize min-h-[32px] ${
                zoom === z
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50"
              } ${z === "day" ? "rounded-l-md" : z === "quarter" ? "rounded-r-md" : ""}`}
            >
              {z}
            </button>
          ))}
        </div>

        {/* View filter toggle */}
        <div className="flex items-center border border-slate-200 rounded-md ml-2">
          <button
            onClick={() => setViewFilter("programme")}
            className={`px-2.5 py-1.5 text-xs font-medium min-h-[32px] rounded-l-md ${
              viewFilter === "programme"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Programme
          </button>
          <button
            onClick={() => setViewFilter("today")}
            className={`px-2.5 py-1.5 text-xs font-medium min-h-[32px] rounded-r-md ${
              viewFilter === "today"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Today&apos;s Work
          </button>
        </div>

        <div className="flex-1" />

        {/* Dependencies toggle */}
        <button
          onClick={() => setShowDeps(!showDeps)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md min-h-[32px] ${
            showDeps ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Deps
        </button>

        {/* Today button */}
        <button
          onClick={scrollToToday}
          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md min-h-[32px] border border-red-200"
        >
          Today
        </button>
      </div>

      {/* Main split pane */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel — sticky task list */}
        <div
          ref={taskListRef}
          onScroll={handleTaskListScroll}
          className="shrink-0 border-r border-slate-200 overflow-y-auto overflow-x-hidden bg-white z-10"
          style={{ width: "var(--gantt-left-width)" }}
        >
          {/* Column headers */}
          <div
            className="border-b border-slate-300 bg-slate-100 flex items-end"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="flex items-center text-[10px] font-semibold text-slate-500 uppercase w-full">
              <span className="flex-1 min-w-0 px-2 py-1 truncate">Task</span>
              <span className="hidden md:block w-14 shrink-0 text-center py-1 border-l border-slate-300">Dur.</span>
              <span className="hidden md:block w-[70px] shrink-0 text-center py-1 border-l border-slate-300">Start</span>
              <span className="hidden md:block w-[70px] shrink-0 text-center py-1 border-l border-slate-300">Finish</span>
              <span className="hidden lg:block w-16 shrink-0 text-center py-1 border-l border-slate-300">Pred.</span>
            </div>
          </div>

          {/* Task rows */}
          {flatTasks.map((node) => {
            const isPhase = node.type === "phase";
            const indent = isPhase ? 0 : node.type === "milestone" ? 0 : node.type === "task" ? 1 : 2;
            const delayCount = delayCountMap.get(node.id) ?? 0;
            const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });

            return (
              <div
                key={node.id}
                className={`flex items-center border-b cursor-pointer ${
                  isPhase
                    ? "bg-slate-800 text-white border-slate-700"
                    : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                }`}
                style={{ height: ROW_HEIGHT, paddingLeft: indent * 12 }}
                onClick={() => onTaskClick?.(tasks.find((t) => t.id === node.id)!)}
              >
                {/* Name — fixed width, truncated */}
                <span
                  className={`flex-1 min-w-0 text-xs truncate px-1.5 ${
                    isPhase ? "font-bold uppercase" : node.type === "subtask" ? "text-slate-500" : "font-medium"
                  }`}
                  title={node.name}
                >
                  {node.name}
                  {delayCount > 0 && (
                    <span className="ml-1 text-[9px] font-bold text-red-500">
                      ({delayCount})
                    </span>
                  )}
                </span>

                {/* Duration */}
                <span className={`hidden md:block w-14 shrink-0 text-center text-[10px] tabular-nums border-l ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
                  {node.duration_days}d
                </span>

                {/* Start Date */}
                <span className={`hidden md:block w-[70px] shrink-0 text-center text-[10px] tabular-nums border-l ${isPhase ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-500"}`}>
                  {fmtDate(node.start_date)}
                </span>

                {/* End Date */}
                <span className={`hidden md:block w-[70px] shrink-0 text-center text-[10px] tabular-nums border-l ${isPhase ? "border-slate-700 text-slate-300" : node.status === "delayed" ? "border-slate-200 text-red-600" : "border-slate-200 text-slate-500"}`}>
                  {fmtDate(node.end_date)}
                </span>

                {/* Predecessors */}
                <span className={`hidden lg:block w-16 shrink-0 text-center text-[10px] tabular-nums truncate border-l ${isPhase ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-400"}`}>
                  {node.predecessors || ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right panel — scrollable SVG timeline */}
        <div
          ref={timelineRef}
          onScroll={handleTimelineScroll}
          className="flex-1 overflow-auto"
        >
          <svg
            width={totalTimelineWidth}
            height={svgHeight + HEADER_HEIGHT}
            className="select-none"
          >
            {/* Background grid */}
            {columns.map((col, i) => (
              <g key={i}>
                <rect
                  x={col.x}
                  y={0}
                  width={col.width}
                  height={svgHeight + HEADER_HEIGHT}
                  fill={i % 2 === 0 ? "#ffffff" : "#f8fafc"}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
              </g>
            ))}

            {/* Top header row (months/years) */}
            {topHeaders.map((h, i) => (
              <g key={`top-${i}`}>
                <rect
                  x={h.x}
                  y={0}
                  width={h.width}
                  height={HEADER_HEIGHT / 2}
                  fill="#f1f5f9"
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
                <text
                  x={h.x + h.width / 2}
                  y={HEADER_HEIGHT / 4 + 4}
                  textAnchor="middle"
                  className="fill-slate-600 text-[10px] font-semibold"
                >
                  {h.label}
                </text>
              </g>
            ))}

            {/* Bottom header row (weeks/days) */}
            {columns.map((col, i) => (
              <g key={`col-${i}`}>
                <rect
                  x={col.x}
                  y={HEADER_HEIGHT / 2}
                  width={col.width}
                  height={HEADER_HEIGHT / 2}
                  fill="#f8fafc"
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
                <text
                  x={col.x + col.width / 2}
                  y={HEADER_HEIGHT / 2 + HEADER_HEIGHT / 4 + 3}
                  textAnchor="middle"
                  className="fill-slate-500 text-[9px]"
                >
                  {col.label}
                </text>
              </g>
            ))}

            {/* Row dividers */}
            {flatTasks.map((_, i) => (
              <line
                key={`row-${i}`}
                x1={0}
                y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                x2={totalTimelineWidth}
                y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke="#e2e8f0"
                strokeWidth={0.5}
              />
            ))}

            {/* Today marker */}
            {todayX >= 0 && todayX <= totalTimelineWidth && (
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={svgHeight + HEADER_HEIGHT}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6,4"
                opacity={0.7}
              />
            )}

            {/* Gantt bars */}
            {flatTasks.map((node, i) => {
              const y = HEADER_HEIGHT + i * ROW_HEIGHT;
              const barY = y + 8;
              const barHeight = ROW_HEIGHT - 16;
              const isPhase = node.type === "phase";
              const isMilestone = node.type === "milestone";
              const delayDays = delayDaysMap.get(node.id) ?? 0;
              const baseline = baselineMap.get(node.id);

              // Phase spans — compute from children if available
              let startDate = new Date(node.start_date);
              let endDate = new Date(node.end_date);
              if (isPhase && node.children.length > 0) {
                startDate = new Date(
                  Math.min(...node.children.map((c) => new Date(c.start_date).getTime()))
                );
                endDate = new Date(
                  Math.max(...node.children.map((c) => new Date(c.end_date).getTime()))
                );
              }

              const barX = getBarX(startDate, rangeStart, totalDays, totalTimelineWidth);
              const barEndX = getBarX(endDate, rangeStart, totalDays, totalTimelineWidth);
              const barWidth = Math.max(4, barEndX - barX);

              const colors = STATUS_BAR_COLORS[node.status] ?? STATUS_BAR_COLORS.not_started;

              // Delay extension
              const delayExtX = barEndX;
              const delayExtWidth = delayDays > 0
                ? getBarX(addDays(endDate, delayDays), rangeStart, totalDays, totalTimelineWidth) - barEndX
                : 0;

              // Baseline bar (thin line below)
              const baselineY = barY + barHeight + 2;
              const baselineStartX = baseline
                ? getBarX(new Date(baseline.start_date), rangeStart, totalDays, totalTimelineWidth)
                : 0;
              const baselineEndX = baseline
                ? getBarX(new Date(baseline.end_date), rangeStart, totalDays, totalTimelineWidth)
                : 0;

              const taskData = tasks.find((t) => t.id === node.id)!;

              // If this bar is being dragged, override positions
              const isDragging = dragState?.task.id === node.id;
              const effectiveBarX = isDragging
                ? getBarX(dragState!.currentStartDate, rangeStart, totalDays, totalTimelineWidth)
                : barX;
              const effectiveBarEndX = isDragging
                ? getBarX(dragState!.currentEndDate, rangeStart, totalDays, totalTimelineWidth)
                : barEndX;
              const effectiveBarWidth = isDragging
                ? Math.max(4, effectiveBarEndX - effectiveBarX)
                : barWidth;

              return (
                <g
                  key={node.id}
                  className={canEdit && !isPhase ? "cursor-grab" : "cursor-pointer"}
                  onClick={() => handleBarClick(taskData)}
                  onDoubleClick={() => handleBarDoubleClick(taskData)}
                >
                  {/* Milestone diamond — centered at the task date */}
                  {isMilestone ? (
                    <>
                      <polygon
                        points={`${barX + 10},${barY + barHeight / 2} ${barX + 1},${barY + 1} ${barX - 8},${barY + barHeight / 2} ${barX + 1},${barY + barHeight - 1}`}
                        fill="#7c3aed"
                        stroke="#5b21b6"
                        strokeWidth={1}
                        style={{ cursor: "pointer" }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      {/* Delay badge */}
                      {(delayCountMap.get(node.id) ?? 0) > 0 && (
                        <g>
                          <circle
                            cx={barX + 18}
                            cy={barY + barHeight / 2}
                            r={6}
                            fill="#ef4444"
                          />
                          <text
                            x={barX + 18}
                            y={barY + barHeight / 2 + 3}
                            textAnchor="middle"
                            className="fill-white text-[8px] font-bold"
                          >
                            !
                          </text>
                        </g>
                      )}
                    </>
                  ) : /* Phase summary bar (diamond ends) */
                  isPhase ? (
                    <>
                      <rect
                        x={barX}
                        y={barY + barHeight / 2 - 2}
                        width={barWidth}
                        height={4}
                        fill="#334155"
                        rx={1}
                      />
                      {/* Start diamond */}
                      <polygon
                        points={`${barX},${barY + barHeight / 2} ${barX + 5},${barY + barHeight / 2 - 5} ${barX + 10},${barY + barHeight / 2} ${barX + 5},${barY + barHeight / 2 + 5}`}
                        fill="#334155"
                      />
                      {/* End diamond */}
                      <polygon
                        points={`${barEndX - 10},${barY + barHeight / 2} ${barEndX - 5},${barY + barHeight / 2 - 5} ${barEndX},${barY + barHeight / 2} ${barEndX - 5},${barY + barHeight / 2 + 5}`}
                        fill="#334155"
                      />
                    </>
                  ) : (
                    <>
                      {/* Main bar */}
                      <rect
                        x={effectiveBarX}
                        y={barY}
                        width={effectiveBarWidth}
                        height={barHeight}
                        fill={colors.bg}
                        rx={4}
                        onMouseDown={(e) => handleBarMouseDown(e, taskData, "move")}
                        style={canEdit ? { cursor: isDragging ? "grabbing" : "grab" } : undefined}
                      />

                      {/* Progress fill */}
                      {node.progress > 0 && (
                        <rect
                          x={effectiveBarX}
                          y={barY}
                          width={Math.min((node.progress / 100) * effectiveBarWidth, effectiveBarWidth)}
                          height={barHeight}
                          fill={colors.progress}
                          rx={4}
                          style={{ pointerEvents: "none" }}
                        />
                      )}

                      {/* Resize handle on right edge */}
                      {canEdit && (
                        <rect
                          x={effectiveBarX + effectiveBarWidth - 6}
                          y={barY}
                          width={6}
                          height={barHeight}
                          fill="transparent"
                          style={{ cursor: "ew-resize" }}
                          onMouseDown={(e) => handleBarMouseDown(e, taskData, "resize-end")}
                        />
                      )}

                      {/* Delay extension (hatched red) */}
                      {delayExtWidth > 0 && (
                        <>
                          <defs>
                            <pattern
                              id={`hatch-${node.id}`}
                              width="6"
                              height="6"
                              patternTransform="rotate(45)"
                              patternUnits="userSpaceOnUse"
                            >
                              <line
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="6"
                                stroke="#ef4444"
                                strokeWidth="3"
                                opacity="0.4"
                              />
                            </pattern>
                          </defs>
                          <rect
                            x={delayExtX}
                            y={barY}
                            width={delayExtWidth}
                            height={barHeight}
                            fill={`url(#hatch-${node.id})`}
                            stroke="#ef4444"
                            strokeWidth={0.5}
                            rx={2}
                          />
                        </>
                      )}

                      {/* Delay indicator badge */}
                      {(delayCountMap.get(node.id) ?? 0) > 0 && (
                        <g>
                          <circle
                            cx={barEndX + (delayExtWidth > 0 ? delayExtWidth : 0) + 8}
                            cy={barY + barHeight / 2}
                            r={6}
                            fill="#ef4444"
                          />
                          <text
                            x={barEndX + (delayExtWidth > 0 ? delayExtWidth : 0) + 8}
                            y={barY + barHeight / 2 + 3}
                            textAnchor="middle"
                            className="fill-white text-[8px] font-bold"
                          >
                            !
                          </text>
                        </g>
                      )}
                    </>
                  )}

                  {/* Baseline bar (thin grey line below main bar) */}
                  {baseline && !isPhase && (
                    <rect
                      x={baselineStartX}
                      y={baselineY}
                      width={Math.max(2, baselineEndX - baselineStartX)}
                      height={2}
                      fill="#94a3b8"
                      rx={1}
                      opacity={0.5}
                    />
                  )}
                </g>
              );
            })}

            {/* Dependency arrows */}
            {showDeps &&
              flatTasks.map((node, i) => {
                if (!node.predecessors) return null;
                const preds = node.predecessors.split(",").map((p) => p.trim());

                return preds.map((predCode) => {
                  const predNode = flatTasks.find(
                    (t) =>
                      t.wbs_code === predCode ||
                      predCode.startsWith(t.wbs_code + "FS")
                  );
                  if (!predNode) return null;

                  const predIdx = flatTasks.indexOf(predNode);
                  const predEndX = getBarX(
                    new Date(predNode.end_date),
                    rangeStart,
                    totalDays,
                    totalTimelineWidth
                  );
                  const succStartX = getBarX(
                    new Date(node.start_date),
                    rangeStart,
                    totalDays,
                    totalTimelineWidth
                  );

                  const predCenterY = HEADER_HEIGHT + predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const succCenterY = HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;

                  // Elbow connector: pred end → right → down/up → succ start
                  const midX = predEndX + 10;
                  const path = `M ${predEndX} ${predCenterY} L ${midX} ${predCenterY} L ${midX} ${succCenterY} L ${succStartX} ${succCenterY}`;

                  return (
                    <g key={`dep-${predNode.id}-${node.id}`}>
                      <path
                        d={path}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={1}
                        opacity={0.6}
                      />
                      {/* Arrow head */}
                      <polygon
                        points={`${succStartX},${succCenterY} ${succStartX - 5},${succCenterY - 3} ${succStartX - 5},${succCenterY + 3}`}
                        fill="#94a3b8"
                        opacity={0.6}
                      />
                    </g>
                  );
                });
              })}
          </svg>
        </div>

        {/* Floating Today button (mobile) */}
        <button
          onClick={scrollToToday}
          className="md:hidden absolute bottom-4 right-4 z-20 w-12 h-12 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Go to today"
        >
          <Calendar className="h-5 w-5" />
        </button>

        {/* Mini-map (date range indicator) */}
        <div className="absolute bottom-0 left-0 right-0 md:hidden h-6 bg-slate-100 border-t border-slate-200 flex items-center px-2">
          <div className="flex-1 h-2 bg-slate-200 rounded-full relative overflow-hidden">
            {timelineRef.current && (
              <div
                className="absolute h-full bg-blue-400 rounded-full"
                style={{
                  left: `${
                    (timelineRef.current.scrollLeft / (totalTimelineWidth - timelineRef.current.clientWidth + 1)) * 100
                  }%`,
                  width: `${Math.max(10, (timelineRef.current.clientWidth / totalTimelineWidth) * 100)}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom sheet for selected bar (mobile) */}
      {selectedBar && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setSelectedBar(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white rounded-t-2xl shadow-xl max-h-[60vh] overflow-y-auto safe-area-pb">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-medium">
                  {selectedBar.type}
                </p>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedBar.wbs_code} {selectedBar.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBar(null)}
                className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              {/* Status + Progress */}
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedBar.status} />
                <span className="text-sm font-semibold tabular-nums">
                  {selectedBar.progress}%
                </span>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Planned Start</span>
                  <p className="font-medium text-slate-700">{selectedBar.start_date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Planned End</span>
                  <p className="font-medium text-slate-700">{selectedBar.end_date}</p>
                </div>
              </div>

              {/* Delay info */}
              {(delayCountMap.get(selectedBar.id) ?? 0) > 0 && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs">
                  <p className="font-medium text-red-700">
                    {delayCountMap.get(selectedBar.id)} delay
                    {(delayCountMap.get(selectedBar.id) ?? 0) !== 1 ? "s" : ""} logged
                    {(delayDaysMap.get(selectedBar.id) ?? 0) > 0 &&
                      ` (+${delayDaysMap.get(selectedBar.id)}d shift)`}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedBar(null);
                    onTaskClick?.(selectedBar);
                  }}
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg min-h-[44px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSelectedBar(null);
                    onLogDelay?.(selectedBar);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg min-h-[44px]"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Log Delay
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop: click bar shows tooltip/detail */}
      {selectedBar && (
        <div className="hidden md:block absolute top-16 right-4 z-30 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-medium">
                {selectedBar.type}
              </p>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedBar.wbs_code} {selectedBar.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedBar(null)}
              className="p-1 rounded hover:bg-slate-100"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={selectedBar.status} />
            <span className="text-xs font-semibold tabular-nums">
              {selectedBar.progress}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <span className="text-slate-400">Start</span>
              <p className="font-medium">{selectedBar.start_date}</p>
            </div>
            <div>
              <span className="text-slate-400">End</span>
              <p className="font-medium">{selectedBar.end_date}</p>
            </div>
          </div>

          {(delayCountMap.get(selectedBar.id) ?? 0) > 0 && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs mb-3">
              <p className="font-medium text-red-700">
                {delayCountMap.get(selectedBar.id)} delay
                {(delayCountMap.get(selectedBar.id) ?? 0) !== 1 ? "s" : ""}
                {(delayDaysMap.get(selectedBar.id) ?? 0) > 0 &&
                  ` — +${delayDaysMap.get(selectedBar.id)} day shift`}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedBar(null);
                onTaskClick?.(selectedBar);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded min-h-[32px]"
            >
              Edit
            </button>
            <button
              onClick={() => {
                setSelectedBar(null);
                onLogDelay?.(selectedBar);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded min-h-[32px]"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Log Delay
            </button>
          </div>
        </div>
      )}

      {/* CSS variable for responsive left panel width */}
      <style jsx>{`
        :root {
          --gantt-left-width: ${LEFT_PANEL_WIDTH_MOBILE}px;
        }
        @media (min-width: 768px) {
          :root {
            --gantt-left-width: ${LEFT_PANEL_WIDTH_DESKTOP}px;
          }
        }
      `}</style>
    </div>
  );
}
