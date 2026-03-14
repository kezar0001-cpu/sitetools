"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { PlanTask, PlanPhase, PublicHoliday, GanttViewConfig } from "@/lib/planner/types";
import {
    generateDateRange,
    getTaskDateRange,
    calculateTaskBar,
    getTodayOffset,
    formatDayHeader,
    groupDatesByMonth,
    isWeekendDate,
    isHolidayDate,
    getDayWidth,
} from "@/lib/planner/gantt-utils";

interface Props {
    tasks: PlanTask[];
    phases: PlanPhase[];
    holidays: PublicHoliday[];
}

const ROW_HEIGHT = 40; // Increased slightly for better Smartsheet feel
const HEADER_HEIGHT = 56;

export function PlannerGanttView({ tasks, phases, holidays }: Props) {
    const [gridWidth, setGridWidth] = useState(340);
    const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
    const [isResizing, setIsResizing] = useState(false);

    const [config, setConfig] = useState<GanttViewConfig>({
        zoomLevel: "week",
        showDependencies: true,
        showMilestones: true,
        showHolidays: true,
        showTodayLine: true,
    });

    const timelineRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const dayWidth = getDayWidth(config.zoomLevel);
    const { start: rangeStart, end: rangeEnd } = useMemo(() => getTaskDateRange(tasks, 14), [tasks]);
    const dates = useMemo(() => generateDateRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
    const monthGroups = useMemo(() => groupDatesByMonth(dates), [dates]);
    const todayOffset = useMemo(() => getTodayOffset(rangeStart, dayWidth), [rangeStart, dayWidth]);
    const totalWidth = dates.length * dayWidth;

    // Resizing logic
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            // Constrain between 200px and 800px
            const newWidth = Math.max(200, Math.min(800, e.clientX - 20));
            setGridWidth(newWidth);
        };

        const handleMouseUp = () => setIsResizing(false);

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    // Scroll to today on mount
    useEffect(() => {
        if (timelineRef.current) {
            const containerWidth = timelineRef.current.clientWidth;
            timelineRef.current.scrollLeft = Math.max(0, todayOffset - containerWidth / 3);
        }
    }, [todayOffset]);

    // Sync scroll between grid and timeline
    const handleTimelineScroll = () => {
        if (timelineRef.current && gridRef.current) {
            gridRef.current.scrollTop = timelineRef.current.scrollTop;
        }
    };

    const handleGridScroll = () => {
        if (gridRef.current && timelineRef.current) {
            timelineRef.current.scrollTop = gridRef.current.scrollTop;
        }
    };

    const togglePhase = (phaseId: string) => {
        setCollapsedPhases(prev => {
            const next = new Set(prev);
            if (next.has(phaseId)) next.delete(phaseId);
            else next.add(phaseId);
            return next;
        });
    };

    // Phase Rollup Calculations
    const phaseRollups = useMemo(() => {
        const rollups = new Map<string, { offsetPx: number; widthPx: number } | null>();
        
        for (const phase of phases) {
            const childTasks = tasks.filter(t => t.phase_id === phase.id && t.planned_start);
            if (childTasks.length === 0) {
                rollups.set(phase.id, null);
                continue;
            }

            const starts = childTasks.map(t => new Date(t.planned_start!).getTime());
            const ends = childTasks.map(t => {
                const finish = t.planned_finish ? new Date(t.planned_finish).getTime() : new Date(t.planned_start!).getTime() + 86400000;
                return finish;
            });

            const earliest = new Date(Math.min(...starts));
            const latest = new Date(Math.max(...ends));

            const startOffset = Math.floor((earliest.getTime() - rangeStart.getTime()) / 86400000);
            const duration = Math.ceil((latest.getTime() - earliest.getTime()) / 86400000);

            rollups.set(phase.id, {
                offsetPx: startOffset * dayWidth,
                widthPx: Math.max(4, duration * dayWidth),
            });
        }
        return rollups;
    }, [tasks, phases, rangeStart, dayWidth]);

    // Build phase-grouped task list (same order as sheet)
    const orderedTasks = useMemo(() => {
        const phaseMap = new Map<string, PlanTask[]>();
        for (const p of phases) phaseMap.set(p.id, []);
        phaseMap.set("none", []);

        for (const task of tasks) {
            const key = task.phase_id ?? "none";
            const arr = phaseMap.get(key);
            if (arr) arr.push(task);
            else phaseMap.set(key, [task]);
        }

        const result: Array<{ type: "phase"; phase: PlanPhase } | { type: "task"; task: PlanTask }> = [];
        for (const p of phases) {
            result.push({ type: "phase", phase: p });
            if (!collapsedPhases.has(p.id)) {
                const pTasks = phaseMap.get(p.id) ?? [];
                for (const t of pTasks) result.push({ type: "task", task: t });
            }
        }
        
        const unphased = phaseMap.get("none") ?? [];
        for (const t of unphased) result.push({ type: "task", task: t });

        return result;
    }, [tasks, phases, collapsedPhases]);

    const renderDependencyLines = () => {
        // Placeholder for future implementation
        return null;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">Gantt Chart</span>

                <div className="flex items-center gap-1 md:ml-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
                    {(["day", "week", "month"] as const).map((level) => (
                        <button
                            key={level}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${config.zoomLevel === level
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                            onClick={() => setConfig((c) => ({ ...c, zoomLevel: level }))}
                        >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                    ))}
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 md:ml-4">
                    <input
                        type="checkbox"
                        checked={config.showHolidays}
                        onChange={(e) => setConfig((c) => ({ ...c, showHolidays: e.target.checked }))}
                    />
                    Holidays
                </label>

                <div className="ml-auto text-xs text-slate-500">
                    {tasks.length} tasks • {dates.length} days
                </div>

                <div className="w-full text-[11px] text-slate-500 md:hidden">
                    Tip: swipe horizontally to view full timeline.
                </div>
            </div>

            {/* Main Gantt area */}
            <div className="overflow-x-auto">
                <div
                    className="flex min-w-[900px]"
                    style={{ height: `${Math.max(400, orderedTasks.length * ROW_HEIGHT + HEADER_HEIGHT + 40)}px` }}
                >
                {/* Left: Task grid */}
                <div
                    className="flex-shrink-0 border-r border-slate-200 overflow-hidden flex flex-col bg-white z-20"
                    style={{ width: `${gridWidth}px` }}
                >
                    {/* Grid header */}
                    <div
                        className="bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200 px-3 flex items-end"
                        style={{ height: `${HEADER_HEIGHT}px` }}
                    >
                        <div className="flex items-center gap-2 pb-2 text-xs font-semibold text-slate-600 w-full">
                            <span className="w-8 text-center">#</span>
                            <span className="flex-1">Task Name</span>
                            <span className="w-16 text-center">Duration</span>
                        </div>
                    </div>

                    {/* Grid body */}
                    <div
                        ref={gridRef}
                        className="overflow-y-auto overflow-x-hidden"
                        style={{ height: `calc(100% - ${HEADER_HEIGHT}px)` }}
                        onScroll={handleGridScroll}
                    >
                        {orderedTasks.map((item) => {
                            if (item.type === "phase") {
                                return (
                                    <div
                                        key={`phase-${item.phase.id}`}
                                        className="flex items-center gap-2 px-3 bg-slate-100 border-b border-slate-200 group cursor-pointer hover:bg-slate-200 transition-colors"
                                        style={{ height: `${ROW_HEIGHT}px` }}
                                        onClick={() => togglePhase(item.phase.id)}
                                    >
                                        <span className="text-[10px] text-slate-400 w-4 flex items-center justify-center transition-transform">
                                            {collapsedPhases.has(item.phase.id) ? "▶" : "▼"}
                                        </span>
                                        {item.phase.color && (
                                            <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: item.phase.color }} />
                                        )}
                                        <span className="text-xs font-bold text-slate-700 truncate">{item.phase.name}</span>
                                    </div>
                                );
                            }

                            const task = item.task;
                            const rowNum = tasks.findIndex((t) => t.id === task.id) + 1;
                            return (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-2 px-3 border-b border-slate-100 hover:bg-amber-50/30 transition-colors"
                                    style={{ height: `${ROW_HEIGHT}px`, paddingLeft: `${12 + (task.indent_level ?? 0) * 16}px` }}
                                >
                                    <span className="w-6 text-xs text-slate-400 font-mono text-center flex-shrink-0">{rowNum}</span>
                                    <span className={`flex-1 text-sm truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                                        {task.is_milestone && <span className="text-purple-500 mr-1">◆</span>}
                                        {task.title}
                                    </span>
                                    <span className="w-14 text-xs text-slate-500 text-center font-mono flex-shrink-0">
                                        {task.duration_days != null ? `${task.duration_days}d` : "—"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Resize handle */}
                <div
                    onMouseDown={handleMouseDown}
                    className={`w-1.5 flex-shrink-0 cursor-col-resize hover:bg-amber-400 transition-colors z-30 ${
                        isResizing ? "bg-amber-500" : "bg-transparent border-r border-slate-200"
                    }`}
                />

                {/* Right: Timeline */}
                <div className="flex-1 overflow-hidden relative bg-white">
                    <div
                        ref={timelineRef}
                        className="overflow-auto w-full h-full"
                        onScroll={handleTimelineScroll}
                    >
                        <div style={{ width: `${totalWidth}px`, minHeight: "100%" }}>
                            {/* Timeline header */}
                            <div
                                className="sticky top-0 z-10 bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200"
                                style={{ height: `${HEADER_HEIGHT}px` }}
                            >
                                {/* Month row */}
                                <div className="flex h-7">
                                    {monthGroups.map((mg, i) => (
                                        <div
                                            key={i}
                                            className="border-r border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700"
                                            style={{ width: `${mg.count * dayWidth}px` }}
                                        >
                                            {mg.count * dayWidth > 60 ? mg.label : ""}
                                        </div>
                                    ))}
                                </div>

                                {/* Day row */}
                                <div className="flex h-7">
                                    {dates.map((date, i) => {
                                        const isWe = isWeekendDate(date);
                                        const isHol = isHolidayDate(date, holidays);
                                        return (
                                            <div
                                                key={i}
                                                className={`border-r border-slate-200 flex items-center justify-center text-[10px] ${isWe ? "bg-slate-200/50 text-slate-400" : isHol ? "bg-red-100/50 text-red-400" : "text-slate-500"
                                                    }`}
                                                style={{ width: `${dayWidth}px` }}
                                                title={
                                                    isHol
                                                        ? holidays.find((h) => h.holiday_date === date.toISOString().slice(0, 10))?.name ?? "Holiday"
                                                        : formatDayHeader(date)
                                                }
                                            >
                                                {dayWidth >= 20 ? date.getDate() : ""}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Task bars */}
                            <div className="relative">
                                {/* Weekend/holiday columns */}
                                {config.showHolidays &&
                                    dates.map((date, i) => {
                                        const isWe = isWeekendDate(date);
                                        const isHol = isHolidayDate(date, holidays);
                                        if (!isWe && !isHol) return null;
                                        return (
                                            <div
                                                key={`bg-${i}`}
                                                className={`absolute top-0 bottom-0 ${isHol ? "bg-red-50/40" : "bg-slate-100/40"}`}
                                                style={{
                                                    left: `${i * dayWidth}px`,
                                                    width: `${dayWidth}px`,
                                                    height: `${orderedTasks.length * ROW_HEIGHT}px`,
                                                }}
                                            />
                                        );
                                    })}

                                {/* Today line */}
                                {config.showTodayLine && todayOffset > 0 && todayOffset < totalWidth && (
                                    <div
                                        className="absolute top-0 z-30"
                                        style={{
                                            left: `${todayOffset}px`,
                                            height: `100%`,
                                        }}
                                    >
                                        <div className="w-0.5 h-full bg-red-500 opacity-60" />
                                        <div className="absolute top-[28px] -left-3.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                            TODAY
                                        </div>
                                    </div>
                                )}

                                {/* SVG Dependency Layer */}
                                <svg
                                    className="absolute inset-0 pointer-events-none z-10"
                                    style={{ width: `${totalWidth}px`, height: `${orderedTasks.length * ROW_HEIGHT}px` }}
                                >
                                    {renderDependencyLines()}
                                </svg>

                                {/* Task rows */}
                                {orderedTasks.map((item, idx) => {
                                    if (item.type === "phase") {
                                        const rollup = phaseRollups.get(item.phase.id);
                                        return (
                                            <div
                                                key={`phase-bar-${item.phase.id}-${idx}`}
                                                className="relative border-b border-slate-200 bg-slate-50/50"
                                                style={{ height: `${ROW_HEIGHT}px` }}
                                            >
                                                {rollup && (
                                                    <div
                                                        className="absolute top-4 h-2 bg-slate-700"
                                                        style={{ left: `${rollup.offsetPx}px`, width: `${rollup.widthPx}px` }}
                                                    >
                                                        {/* Smartsheet-style brackets */}
                                                        <div className="absolute left-0 top-0 w-0.5 h-3 bg-slate-700" />
                                                        <div className="absolute right-0 top-0 w-0.5 h-3 bg-slate-700" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    const task = item.task;
                                    const bar = calculateTaskBar(task, rangeStart, dayWidth);

                                    return (
                                        <div
                                            key={`${task.id}-${idx}`}
                                            className="relative border-b border-slate-100 group hover:bg-slate-50/50 transition-colors"
                                            style={{ height: `${ROW_HEIGHT}px` }}
                                        >
                                            {bar && (
                                                <div
                                                    className="absolute top-2.5 h-3.5 rounded-full transition-all group cursor-pointer"
                                                    style={{
                                                        left: `${bar.offsetPx}px`,
                                                        width: `${Math.max(8, bar.widthPx)}px`,
                                                    }}
                                                    title={`${task.title}\n${task.planned_start ?? "?"} → ${task.planned_finish ?? "?"}\n${task.percent_complete}% complete`}
                                                >
                                                    {/* Background bar */}
                                                    <div
                                                        className="absolute inset-0 rounded-full opacity-30 shadow-sm"
                                                        style={{ backgroundColor: bar.color }}
                                                    />
                                                    
                                                    {/* Progress fill */}
                                                    <div
                                                        className="absolute inset-y-0.5 left-0.5 rounded-full"
                                                        style={{
                                                            width: `calc(${task.percent_complete}% - 4px)`,
                                                            backgroundColor: bar.color,
                                                            filter: 'brightness(0.9)',
                                                            minWidth: task.percent_complete > 0 ? '4px' : '0'
                                                        }}
                                                    />

                                                    {/* Floating Label (Always Right) */}
                                                    <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-slate-600 pointer-events-none group-hover:text-slate-900 transition-colors">
                                                        {task.title}
                                                    </span>

                                                    {/* Milestone diamond - Perfectly centered on start line */}
                                                    {task.is_milestone && (
                                                        <div 
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-purple-600 rotate-45 rounded-sm shadow-md border-2 border-white" 
                                                            style={{ zIndex: 5 }}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {!task.planned_start && (
                                                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 italic">
                                                    (No dates defined)
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
