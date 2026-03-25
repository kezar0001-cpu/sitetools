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
  Share2,
  GitBranch,
} from "lucide-react";
import type {
  SitePlanTask,
  SitePlanTaskNode,
  SitePlanDelayLog,
} from "@/types/siteplan";
import {
  buildTaskTree,
  flattenTree,
} from "@/types/siteplan";
import { useUpdateTask } from "@/hooks/useSitePlanTasks";
import { StatusBadge } from "./StatusBadge";
import { STATUS_BAR_COLORS } from "@/lib/sitePlanColors";
import { computeCriticalPath } from "@/lib/criticalPath";
import {
  daysBetween,
  addDays,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  formatMonth,
  formatWeek,
  formatDay,
  formatQuarter,
} from "@/lib/siteplanDateUtils";

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

const ZOOM_COLUMN_WIDTH: Record<ZoomLevel, number> = {
  day: 40,
  week: 120,
  month: 200,
  quarter: 300,
};

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

// ─── Dependency arrow color ─────────────────────────────────

function getDepArrowColor(pred: SitePlanTaskNode, succ: SitePlanTaskNode): string {
  // Red: successor is delayed, or predecessor's end is after successor's start (constraint violated)
  if (succ.status === "delayed") return "#ef4444";
  const predEnd = new Date(pred.end_date);
  const succStart = new Date(succ.start_date);
  if (predEnd > succStart) return "#ef4444";

  // Yellow: tight gap (≤ 3 days) or successor is on hold
  const gapDays = daysBetween(predEnd, succStart);
  if (gapDays <= 3 || succ.status === "on_hold") return "#f59e0b";

  // Green: on time
  return "#22c55e";
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
  const [viewFilter] = useState<ViewFilter>("programme");
  const [showDeps, setShowDeps] = useState(initialShowDeps);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [selectedBar, setSelectedBar] = useState<SitePlanTask | null>(null);
  const [selectedDep, setSelectedDep] = useState<{ predId: string; succId: string } | null>(null);
  const [arrowTooltip, setArrowTooltip] = useState<{
    x: number;
    y: number;
    predName: string;
    succName: string;
  } | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{
    x: number;
    y: number;
    task: SitePlanTask;
  } | null>(null);
  const [expandedPhases] = useState<Set<string>>(new Set());
  const [allExpanded] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);

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

  // Critical path computation (only when toggle is on)
  const criticalPathIds = useMemo(
    () => (showCriticalPath ? computeCriticalPath(tasks) : new Set<string>()),
    [showCriticalPath, tasks]
  );

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

  // useUpdateTask for resize-end drag (called directly without parent callback)
  const updateTask = useUpdateTask();
  const updateTaskRef = useRef(updateTask);
  updateTaskRef.current = updateTask;

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
      setHoverTooltip(null);
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

  // Bar hover handlers — show/update/hide the floating tooltip
  const handleBarMouseEnter = useCallback(
    (e: React.MouseEvent, task: SitePlanTask) => {
      setHoverTooltip({ x: e.clientX, y: e.clientY, task });
    },
    []
  );
  const handleBarMouseMove = useCallback((e: React.MouseEvent) => {
    setHoverTooltip((prev) =>
      prev ? { ...prev, x: e.clientX, y: e.clientY } : null
    );
  }, []);
  const handleBarMouseLeave = useCallback(() => {
    setHoverTooltip(null);
  }, []);

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
          if (dragState.mode === "resize-end") {
            // Drag-handle resize: update end_date directly via mutation
            updateTaskRef.current.mutate({
              id: dragState.task.id,
              projectId: dragState.task.project_id,
              updates: { end_date: newEnd },
            });
          } else {
            onDateChange?.(dragState.task, newStart, newEnd);
          }
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

  // Bar click handler — select bar for visual highlight and open TaskEditPanel immediately
  const handleBarClick = (task: SitePlanTask) => {
    setSelectedBar((prev) => (prev?.id === task.id ? null : task));
    onTaskClick?.(task);
  };

  // Bar double-click handler
  const handleBarDoubleClick = (task: SitePlanTask) => {
    onDoubleClick?.(task);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Controls bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-shrink-0 overflow-x-auto">
        {/* Zoom buttons */}
        <span className="text-[10px] font-medium text-slate-400 uppercase mr-1 hidden md:inline">Zoom</span>
        {(["day", "week", "month", "quarter"] as ZoomLevel[]).map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2 py-1 text-[11px] font-medium rounded capitalize min-h-[28px] transition-colors ${
              zoom === z
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:bg-slate-200"
            }`}
          >
            {z.charAt(0).toUpperCase() + z.slice(1)}
          </button>
        ))}

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Show Dependencies toggle */}
        <button
          onClick={() => {
            setShowDeps((v) => !v);
            if (showDeps) setSelectedDep(null);
          }}
          title={showDeps ? "Hide dependency arrows" : "Show dependency arrows"}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded min-h-[28px] transition-colors ${
            showDeps
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "text-slate-500 hover:bg-slate-200 border border-transparent"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Show Dependencies</span>
          <span className="sm:hidden">Deps</span>
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Critical Path toggle */}
        <button
          onClick={() => setShowCriticalPath((v) => !v)}
          title={showCriticalPath ? "Hide critical path" : "Show critical path"}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded min-h-[28px] transition-colors ${
            showCriticalPath
              ? "bg-red-100 text-red-700 border border-red-300"
              : "text-slate-500 hover:bg-slate-200 border border-transparent"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Critical Path</span>
          <span className="sm:hidden">CP</span>
        </button>

        {/* Clear selected dependency */}
        {selectedDep && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
              onClick={() => setSelectedDep(null)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-200 rounded min-h-[28px]"
            >
              <X className="h-3 w-3" />
              Clear selection
            </button>
          </>
        )}
      </div>

      {/* Main split pane */}
      <div className="flex flex-1 overflow-hidden relative">
      {/* Left panel removed */}

        {/* Right panel — scrollable SVG timeline */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-auto"
        >
          <svg
            width={totalTimelineWidth}
            height={svgHeight + HEADER_HEIGHT}
            className="select-none"
            onClick={() => setSelectedDep(null)}
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

              // Dependency highlight / dim
              const isDepHighlighted =
                selectedDep !== null &&
                (node.id === selectedDep.predId || node.id === selectedDep.succId);
              const isDepDimmed = selectedDep !== null && !isDepHighlighted;

              // Critical path
              const isCritical = showCriticalPath && criticalPathIds.has(node.id);

              // Milestone geometry (symmetric diamond centered on start_date)
              const mCx = barX;
              const mCy = barY + barHeight / 2;
              const mR = Math.min(barHeight / 2 - 1, 10);

              const isSelected = selectedBar?.id === node.id;

              return (
                <g
                  key={node.id}
                  className={canEdit && !isPhase ? "cursor-grab" : "cursor-pointer"}
                  opacity={isDepDimmed ? 0.25 : 1}
                  onClick={() => handleBarClick(taskData)}
                  onDoubleClick={() => handleBarDoubleClick(taskData)}
                >
                  {/* Milestone — proper symmetric diamond centered on start_date */}
                  {isMilestone ? (
                    <>
                      <polygon
                        points={`${mCx},${mCy - mR} ${mCx + mR},${mCy} ${mCx},${mCy + mR} ${mCx - mR},${mCy}`}
                        fill="#7c3aed"
                        stroke="#5b21b6"
                        strokeWidth={1}
                        style={{ cursor: "pointer" }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => handleBarMouseEnter(e, taskData)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarMouseLeave}
                      />
                      {/* Delay badge */}
                      {(delayCountMap.get(node.id) ?? 0) > 0 && (
                        <g>
                          <circle
                            cx={mCx + mR + 8}
                            cy={mCy}
                            r={6}
                            fill="#ef4444"
                          />
                          <text
                            x={mCx + mR + 8}
                            y={mCy + 3}
                            textAnchor="middle"
                            className="fill-white text-[8px] font-bold"
                          >
                            !
                          </text>
                        </g>
                      )}
                      {/* Selected ring */}
                      {isSelected && (
                        <polygon
                          points={`${mCx},${mCy - mR - 3} ${mCx + mR + 3},${mCy} ${mCx},${mCy + mR + 3} ${mCx - mR - 3},${mCy}`}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={2}
                          style={{ pointerEvents: "none" }}
                        />
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
                        onMouseEnter={(e) => handleBarMouseEnter(e, taskData)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarMouseLeave}
                      />
                      {/* Start diamond */}
                      <polygon
                        points={`${barX},${barY + barHeight / 2} ${barX + 5},${barY + barHeight / 2 - 5} ${barX + 10},${barY + barHeight / 2} ${barX + 5},${barY + barHeight / 2 + 5}`}
                        fill="#334155"
                        style={{ pointerEvents: "none" }}
                      />
                      {/* End diamond */}
                      <polygon
                        points={`${barEndX - 10},${barY + barHeight / 2} ${barEndX - 5},${barY + barHeight / 2 - 5} ${barEndX},${barY + barHeight / 2} ${barEndX - 5},${barY + barHeight / 2 + 5}`}
                        fill="#334155"
                        style={{ pointerEvents: "none" }}
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
                        onMouseEnter={(e) => handleBarMouseEnter(e, taskData)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarMouseLeave}
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

                      {/* Resize handle on right edge — 8px wide grab zone with visible grip line */}
                      {canEdit && (
                        <g
                          onMouseDown={(e) => handleBarMouseDown(e, taskData, "resize-end")}
                          style={{ cursor: "ew-resize" }}
                        >
                          <rect
                            x={effectiveBarX + effectiveBarWidth - 8}
                            y={barY}
                            width={8}
                            height={barHeight}
                            fill="transparent"
                          />
                          {/* Visible grip indicator */}
                          <line
                            x1={effectiveBarX + effectiveBarWidth - 3}
                            y1={barY + 3}
                            x2={effectiveBarX + effectiveBarWidth - 3}
                            y2={barY + barHeight - 3}
                            stroke="rgba(0,0,0,0.25)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            style={{ pointerEvents: "none" }}
                          />
                        </g>
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

                  {/* Selected bar ring */}
                  {isSelected && !isMilestone && !isPhase && (
                    <rect
                      x={effectiveBarX - 2}
                      y={barY - 2}
                      width={effectiveBarWidth + 4}
                      height={barHeight + 4}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={2}
                      rx={5}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  {isSelected && isPhase && (
                    <rect
                      x={barX - 2}
                      y={barY - 2}
                      width={barWidth + 4}
                      height={barHeight + 4}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={2}
                      rx={3}
                      style={{ pointerEvents: "none" }}
                    />
                  )}

                  {/* Dependency highlight ring */}
                  {isDepHighlighted && !isMilestone && !isPhase && (
                    <rect
                      x={effectiveBarX - 2}
                      y={barY - 2}
                      width={effectiveBarWidth + 4}
                      height={barHeight + 4}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      rx={5}
                      style={{ pointerEvents: "none" }}
                    />
                  )}

                  {/* Critical path highlight */}
                  {isCritical && !isMilestone && !isPhase && (
                    <rect
                      x={effectiveBarX - 2}
                      y={barY - 2}
                      width={effectiveBarWidth + 4}
                      height={barHeight + 4}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      rx={5}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  {isCritical && isPhase && (
                    <rect
                      x={barX - 2}
                      y={barY - 2}
                      width={barWidth + 4}
                      height={barHeight + 4}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      rx={3}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  {isCritical && isMilestone && (
                    <polygon
                      points={`${barX + 10},${barY + barHeight / 2 - 2} ${barX + 1},${barY - 1} ${barX - 10},${barY + barHeight / 2 - 2} ${barX + 1},${barY + barHeight + 1}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                </g>
              );
            })}

            {/* Dependency arrows */}
            {showDeps &&
              flatTasks.flatMap((node, i) => {
                if (!node.predecessors) return [];
                // Cap at 50 dependencies per task
                const preds = node.predecessors
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .slice(0, 50);

                return preds.flatMap((predCode) => {
                  const predNode = flatTasks.find(
                    (t) =>
                      t.wbs_code === predCode ||
                      predCode.startsWith(t.wbs_code + "FS")
                  );
                  if (!predNode) return [];

                  const predIdx = flatTasks.indexOf(predNode);
                  const isSelected =
                    selectedDep?.predId === predNode.id &&
                    selectedDep?.succId === node.id;
                  const arrowColor = getDepArrowColor(predNode, node);

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

                  const predCenterY =
                    HEADER_HEIGHT + predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const succCenterY =
                    HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;

                  // Elbow connector: pred end → right elbow → down/up → succ start
                  const elbowX = predEndX + 10;
                  const pathD = `M ${predEndX} ${predCenterY} L ${elbowX} ${predCenterY} L ${elbowX} ${succCenterY} L ${succStartX} ${succCenterY}`;
                  const arrowOpacity = selectedDep && !isSelected ? 0.15 : 0.85;

                  return [
                    <g
                      key={`dep-${predNode.id}-${node.id}`}
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDep(
                          isSelected
                            ? null
                            : { predId: predNode.id, succId: node.id }
                        );
                      }}
                    >
                      {/* Wide invisible hit area */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                        onMouseEnter={(e) =>
                          setArrowTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            predName: predNode.name,
                            succName: node.name,
                          })
                        }
                        onMouseMove={(e) =>
                          setArrowTooltip((prev) =>
                            prev
                              ? { ...prev, x: e.clientX, y: e.clientY }
                              : null
                          )
                        }
                        onMouseLeave={() => setArrowTooltip(null)}
                      />

                      {/* Visible path */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={arrowColor}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        opacity={arrowOpacity}
                        style={{ pointerEvents: "none" }}
                      />

                      {/* Arrow head */}
                      <polygon
                        points={`${succStartX},${succCenterY} ${succStartX - 6},${succCenterY - 3} ${succStartX - 6},${succCenterY + 3}`}
                        fill={arrowColor}
                        opacity={arrowOpacity}
                        style={{ pointerEvents: "none" }}
                      />
                    </g>,
                  ];
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

      {/* Hover tooltip — bar-level info card (both mobile & desktop) */}
      {hoverTooltip && !dragState && (
        <div
          className="fixed z-[200] pointer-events-none bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[200px]"
          style={{
            left: hoverTooltip.x + 16,
            top: hoverTooltip.y - 90,
          }}
        >
          <p className="font-semibold text-slate-900 mb-1.5 leading-tight">
            {hoverTooltip.task.wbs_code} {hoverTooltip.task.name}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={hoverTooltip.task.status} />
            <span className="font-semibold tabular-nums text-slate-700">
              {hoverTooltip.task.progress}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-500">
            <span className="text-slate-400">Start</span>
            <span className="font-medium text-slate-700 text-right">
              {hoverTooltip.task.start_date}
            </span>
            <span className="text-slate-400">End</span>
            <span className="font-medium text-slate-700 text-right">
              {hoverTooltip.task.end_date}
            </span>
          </div>
          {(delayCountMap.get(hoverTooltip.task.id) ?? 0) > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-red-600 font-medium">
              {delayCountMap.get(hoverTooltip.task.id)} delay
              {(delayCountMap.get(hoverTooltip.task.id) ?? 0) !== 1 ? "s" : ""}
              {(delayDaysMap.get(hoverTooltip.task.id) ?? 0) > 0 &&
                ` (+${delayDaysMap.get(hoverTooltip.task.id)}d)`}
            </div>
          )}
        </div>
      )}

      {/* Dependency arrow hover tooltip */}
      {arrowTooltip && (
        <div
          className="fixed z-[200] pointer-events-none bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap"
          style={{ left: arrowTooltip.x + 14, top: arrowTooltip.y - 36 }}
        >
          <span className="font-semibold">{arrowTooltip.predName}</span>
          <span className="text-slate-300"> must finish before </span>
          <span className="font-semibold">{arrowTooltip.succName}</span>
        </div>
      )}

      <style jsx>{`
      `}</style>
    </div>
  );
}
