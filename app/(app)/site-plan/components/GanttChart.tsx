"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import type { RefObject } from "react";
import {
  Calendar,
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
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
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

interface GanttChartProps {
  tasks: SitePlanTask[];
  baselines?: SitePlanTask[];
  delayLogs?: SitePlanDelayLog[];
  zoom: ZoomLevel;
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  selectedTaskId?: string | null;
  hoveredTaskId?: string | null;
  onTaskClick?: (task: SitePlanTask) => void;
  onDoubleClick?: (task: SitePlanTask) => void;
  onDateChange?: (task: SitePlanTask, start_date: string, end_date: string) => void;
  onLogDelay?: (task: SitePlanTask) => void;
  canEdit?: boolean;
  todayTrigger?: number;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onVerticalScroll?: (scrollTop: number) => void;
}

// ─── Constants ──────────────────────────────────────────────

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 56;

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
  zoom,
  showDependencies: showDeps = true,
  showCriticalPath = false,
  selectedTaskId,
  hoveredTaskId,
  onTaskClick,
  onDoubleClick,
  onDateChange,
  canEdit = true,
  todayTrigger,
  scrollContainerRef,
  onVerticalScroll,
}: GanttChartProps) {
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
  const [headerOffsetY, setHeaderOffsetY] = useState(0);
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
  const flatTasks = useMemo(() => flattenTree(tree), [tree]);

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
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
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

  useEffect(() => {
    if (todayTrigger === undefined) return;
    scrollToToday();
  }, [todayTrigger, scrollToToday]);

  useEffect(() => {
    if (!selectedTaskId || !timelineRef.current) return;
    const selectedIndex = flatTasks.findIndex((task) => task.id === selectedTaskId);
    if (selectedIndex < 0) return;
    const selectedNode = flatTasks[selectedIndex];
    const startDate = new Date(selectedNode.start_date);
    const barX = getBarX(startDate, rangeStart, totalDays, totalTimelineWidth);

    timelineRef.current.scrollTo({
      top: selectedIndex * ROW_HEIGHT,
      left: Math.max(0, barX - 120),
      behavior: "smooth",
    });
  }, [selectedTaskId, flatTasks, rangeStart, totalDays, totalTimelineWidth]);

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
    setSelectedBar(task);
    onTaskClick?.(task);
  };

  // Bar double-click handler
  const handleBarDoubleClick = (task: SitePlanTask) => {
    onDoubleClick?.(task);
  };

  useEffect(() => {
    if (!showDeps) {
      setSelectedDep(null);
    }
  }, [showDeps]);

  const isTodayColumn = useCallback((colDate: Date) => {
    if (zoom === "day") {
      return daysBetween(colDate, today) === 0;
    }
    if (zoom === "week") {
      return startOfWeek(new Date(colDate)).getTime() === startOfWeek(new Date(today)).getTime();
    }
    if (zoom === "month") {
      return colDate.getMonth() === today.getMonth() && colDate.getFullYear() === today.getFullYear();
    }
    return startOfQuarter(new Date(colDate)).getTime() === startOfQuarter(new Date(today)).getTime();
  }, [today, zoom]);

  return (
    <ComponentErrorBoundary>
    <div className="flex flex-col h-full bg-white">
      {/* Main split pane */}
      <div className="flex flex-1 overflow-hidden relative">
      {/* Left panel removed */}

        {/* Right panel — scrollable SVG timeline */}
        <div
          ref={(el) => {
            timelineRef.current = el;
            if (scrollContainerRef) {
              scrollContainerRef.current = el;
            }
          }}
          className="flex-1 overflow-auto"
          onScroll={(e) => {
            setHeaderOffsetY(e.currentTarget.scrollTop);
            onVerticalScroll?.(e.currentTarget.scrollTop);
          }}
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

            {/* Top header row (sticky: year/quarter/month) */}
            {topHeaders.map((h, i) => (
              <g key={`top-${i}`}>
                <rect
                  x={h.x}
                  y={headerOffsetY}
                  width={h.width}
                  height={HEADER_HEIGHT / 2}
                  fill="#f1f5f9"
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
                <text
                  x={h.x + h.width / 2}
                  y={headerOffsetY + HEADER_HEIGHT / 4 + 4}
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
                  y={headerOffsetY + HEADER_HEIGHT / 2}
                  width={col.width}
                  height={HEADER_HEIGHT / 2}
                  fill={isTodayColumn(col.date) ? "#dbeafe" : "#f8fafc"}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
                <text
                  x={col.x + col.width / 2}
                  y={headerOffsetY + HEADER_HEIGHT / 2 + HEADER_HEIGHT / 4 + 3}
                  textAnchor="middle"
                  className={isTodayColumn(col.date) ? "fill-blue-700 text-[9px] font-semibold" : "fill-slate-500 text-[9px]"}
                >
                  {col.label}
                </text>
              </g>
            ))}

            {/* Row dividers */}
            {flatTasks.map((node, i) => (
              <g key={`row-${node.id}`}>
                {hoveredTaskId === node.id && (
                  <rect
                    x={0}
                    y={HEADER_HEIGHT + i * ROW_HEIGHT}
                    width={totalTimelineWidth}
                    height={ROW_HEIGHT}
                    fill="#dbeafe"
                    fillOpacity={0.3}
                  />
                )}
                {(selectedTaskId === node.id || selectedBar?.id === node.id) && (
                  <rect
                    x={0}
                    y={HEADER_HEIGHT + i * ROW_HEIGHT}
                    width={totalTimelineWidth}
                    height={ROW_HEIGHT}
                    fill="#eff6ff"
                  />
                )}
                <line
                  x1={0}
                  y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                  x2={totalTimelineWidth}
                  y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
              </g>
            ))}

            {/* Today marker */}
            {todayX >= 0 && todayX <= totalTimelineWidth && (
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={svgHeight + HEADER_HEIGHT}
                stroke="#2563eb"
                strokeWidth={2}
                opacity={0.9}
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
              const effectiveBarX = isDragging && dragState?.mode === "resize-end"
                ? getBarX(dragState!.currentStartDate, rangeStart, totalDays, totalTimelineWidth)
                : barX;
              const effectiveBarEndX = isDragging && dragState?.mode === "resize-end"
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

              const isSelected = selectedTaskId
                ? selectedTaskId === node.id
                : selectedBar?.id === node.id;

              const showInsideLabel = !isMilestone && barWidth > 60;
              const labelX = isMilestone ? mCx + mR + 8 : (showInsideLabel ? barX + 8 : barEndX + 8);
              const labelY = barY + barHeight / 2 + 4;

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
                  ) : /* Phase summary bar style */
                  isPhase ? (
                    <>
                      <line
                        x1={barX}
                        y1={barY + 4}
                        x2={barEndX}
                        y2={barY + 4}
                        stroke="#111827"
                        strokeWidth={3}
                        onMouseEnter={(e) => handleBarMouseEnter(e, taskData)}
                        onMouseMove={handleBarMouseMove}
                        onMouseLeave={handleBarMouseLeave}
                      />
                      <line
                        x1={barX}
                        y1={barY + barHeight - 4}
                        x2={barEndX}
                        y2={barY + barHeight - 4}
                        stroke="#111827"
                        strokeWidth={3}
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
                      {dragState?.mode === "move" && isDragging && (
                        <rect
                          x={getBarX(dragState.currentStartDate, rangeStart, totalDays, totalTimelineWidth)}
                          y={barY}
                          width={Math.max(
                            4,
                            getBarX(dragState.currentEndDate, rangeStart, totalDays, totalTimelineWidth) -
                              getBarX(dragState.currentStartDate, rangeStart, totalDays, totalTimelineWidth)
                          )}
                          height={barHeight}
                          fill={colors.progress}
                          opacity={0.35}
                          rx={4}
                          stroke="#0f172a"
                          strokeDasharray="4,2"
                        />
                      )}

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

                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={isMilestone || !showInsideLabel ? "start" : "start"}
                    className={showInsideLabel ? "fill-white text-[10px] font-semibold pointer-events-none" : "fill-slate-700 text-[10px] pointer-events-none"}
                  >
                    {node.name}
                  </text>

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
    </ComponentErrorBoundary>
  );
}
