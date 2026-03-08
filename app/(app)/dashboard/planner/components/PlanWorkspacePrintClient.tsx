"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPlanById, fetchPlanPhases, fetchPlanTasks } from "@/lib/planner/client";
import { PlannerPlanWithContext, PlanPhase, PlanTask, STATUS_COLORS } from "@/lib/planner/types";
import { calculateTaskBar, generateDateRange, getTaskDateRange, groupDatesByMonth } from "@/lib/planner/gantt-utils";

interface Props {
    planId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isCriticalTask(task: PlanTask, _allTasks: PlanTask[]): boolean {
    if (task.percent_complete >= 100) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (task.planned_finish && task.planned_finish < today && task.percent_complete < 100) return true;
    if (task.status === "blocked") return false;
    if (task.planned_finish && task.planned_start) {
        const start = new Date(task.planned_start).getTime();
        const end = new Date(task.planned_finish).getTime();
        const now = Date.now();
        if (end > start && now >= start) {
            const elapsed = (now - start) / (end - start);
            if (elapsed > 0.8 && task.percent_complete < 60) return true;
        }
    }
    return false;
}

export function PlanWorkspacePrintClient({ planId }: Props) {
    const [plan, setPlan] = useState<PlannerPlanWithContext | null>(null);
    const [phases, setPhases] = useState<PlanPhase[]>([]);
    const [tasks, setTasks] = useState<PlanTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchPlanById(planId), fetchPlanPhases(planId), fetchPlanTasks(planId)])
            .then(([p, ph, t]) => {
                setPlan(p);
                setPhases(ph);
                setTasks(t);
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load plan."))
            .finally(() => setLoading(false));
    }, [planId]);

    const triggerPrint = useCallback(() => {
        setTimeout(() => window.print(), 300);
    }, []);

    useEffect(() => {
        if (!loading && !error) triggerPrint();
    }, [loading, error, triggerPrint]);

    const printDate = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const today = new Date().toISOString().slice(0, 10);

    const groupedTasks = phases.map((phase) => ({
        phase,
        tasks: tasks.filter((t) => t.phase_id === phase.id),
    })).filter((g) => g.tasks.length > 0);

    const printableRows = [
        ...groupedTasks.flatMap((group) => [
            { type: "phase" as const, phase: group.phase },
            ...group.tasks.map((task) => ({ type: "task" as const, task })),
        ]),
        ...tasks.filter((t) => !t.phase_id).map((task) => ({ type: "task" as const, task })),
    ];

    const { start: ganttStart, end: ganttEnd } = getTaskDateRange(tasks, 7);
    const ganttDates = generateDateRange(ganttStart, ganttEnd);
    const ganttMonthGroups = groupDatesByMonth(ganttDates);
    const ganttContentWidth = 940;
    const ganttDayWidth = Math.min(18, Math.max(8, Math.floor(ganttContentWidth / Math.max(1, ganttDates.length))));
    const ganttActualWidth = ganttDates.length * ganttDayWidth;
    const ganttRowHeight = 22;

    const unphasedTasks = tasks.filter((t) => !t.phase_id);

    const summary = {
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
        blocked: tasks.filter((t) => t.status === "blocked").length,
        overdue: tasks.filter((t) => t.planned_finish && t.planned_finish < today && t.status !== "done").length,
        avgProgress: tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.percent_complete, 0) / tasks.length) : 0,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
            </div>
        );
    }
    if (error || !plan) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-600">{error ?? "Plan not found."}</p>
            </div>
        );
    }

    return (
        <>
            {/* Print CSS */}
            <style>{`
        @page {
          size: A4 landscape;
          margin: 12mm 10mm;
        }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
          tr { page-break-inside: avoid; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

            {/* Screen action bar */}
            <div className="no-print fixed top-0 inset-x-0 bg-slate-900 text-white px-6 py-3 flex items-center justify-between z-50">
                <div>
                    <p className="font-semibold text-sm">PDF Export: {plan.name}</p>
                    <p className="text-xs text-slate-400">Review below then print / Save as PDF</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
                    >
                        ← Back
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-5 py-2 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors"
                    >
                        🖨︎ Print / Save PDF
                    </button>
                </div>
            </div>

            {/* Print content */}
            <div className="pt-16 px-6 pb-10 max-w-[1200px] mx-auto print:pt-0 print:px-0 print:max-w-none">
                {/* Cover / header */}
                <div className="border-b-4 border-slate-900 pb-4 mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">SitePlan — Project Report</p>
                            <h1 className="text-3xl font-black text-slate-900">{plan.name}</h1>
                            {plan.description && <p className="text-sm text-slate-600 mt-1 max-w-2xl">{plan.description}</p>}
                        </div>
                        <div className="text-right text-xs text-slate-500 flex-shrink-0 ml-6">
                            <p className="font-semibold text-slate-700 text-sm">{printDate}</p>
                            {plan.projects?.name && <p>Project: {plan.projects.name}</p>}
                            <p>Status: <span className="font-semibold capitalize">{plan.status}</span></p>
                        </div>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-5 gap-3 mt-5">
                        {[
                            { label: "Total Tasks", value: summary.total, color: "bg-slate-100 text-slate-800" },
                            { label: "Completed", value: summary.done, color: "bg-emerald-50 text-emerald-800" },
                            { label: "Overdue", value: summary.overdue, color: "bg-red-50 text-red-800" },
                            { label: "Blocked", value: summary.blocked, color: "bg-orange-50 text-orange-800" },
                            { label: "Avg Progress", value: `${summary.avgProgress}%`, color: "bg-blue-50 text-blue-800" },
                        ].map((s) => (
                            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                                <p className="text-2xl font-black">{s.value}</p>
                                <p className="text-xs font-medium mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-5 text-xs">
                    <span className="font-bold text-slate-600 uppercase tracking-wide">Legend:</span>
                    {[
                        { label: "Completed", bg: "bg-emerald-100 text-emerald-800" },
                        { label: "In Progress", bg: "bg-blue-100 text-blue-800" },
                        { label: "Not Started", bg: "bg-slate-100 text-slate-600" },
                        { label: "Blocked", bg: "bg-orange-100 text-orange-800" },
                        { label: "Overdue", bg: "bg-red-100 text-red-800 ring-1 ring-red-300" },
                        { label: "Critical Path", bg: "bg-red-200 text-red-900 font-bold" },
                    ].map((l) => (
                        <span key={l.label} className={`px-2.5 py-1 rounded-full font-medium ${l.bg}`}>{l.label}</span>
                    ))}
                </div>

                <div className="page-break" />

                <section>
                    <h2 className="text-lg font-black text-slate-900 mb-3">Gantt Chart Snapshot</h2>
                    <div className="border border-slate-200 rounded-xl overflow-hidden" style={{ fontSize: "10px" }}>
                        <div className="grid" style={{ gridTemplateColumns: `280px ${ganttActualWidth}px` }}>
                            <div className="bg-slate-100 border-r border-slate-200 p-2 font-semibold text-slate-700">Task</div>
                            <div className="bg-slate-100">
                                <div className="flex h-6 border-b border-slate-200">
                                    {ganttMonthGroups.map((month, idx) => (
                                        <div
                                            key={`month-${idx}`}
                                            className="border-r border-slate-200 flex items-center justify-center font-semibold text-slate-700"
                                            style={{ width: `${month.count * ganttDayWidth}px` }}
                                        >
                                            {month.label}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex h-6">
                                    {ganttDates.map((date, idx) => (
                                        <div key={`day-${idx}`} className="border-r border-slate-100 flex items-center justify-center text-slate-500" style={{ width: `${ganttDayWidth}px` }}>
                                            {date.getDate()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {printableRows.map((row, index) => {
                            if (row.type === "phase") {
                                return (
                                    <div key={`phase-${row.phase.id}`} className="grid" style={{ gridTemplateColumns: `280px ${ganttActualWidth}px` }}>
                                        <div className="bg-slate-800 text-white px-2 py-1 font-semibold border-r border-slate-700">{row.phase.name}</div>
                                        <div className="bg-slate-800 border-b border-slate-700" />
                                    </div>
                                );
                            }

                            const bar = calculateTaskBar(row.task, ganttStart, ganttDayWidth);

                            return (
                                <div key={row.task.id} className="grid border-t border-slate-100" style={{ gridTemplateColumns: `280px ${ganttActualWidth}px` }}>
                                    <div className="px-2 py-1 border-r border-slate-100 text-slate-700 truncate">
                                        {index + 1}. {row.task.title}
                                    </div>
                                    <div className="relative" style={{ height: `${ganttRowHeight}px` }}>
                                        {bar && (
                                            <div
                                                className="absolute top-1 rounded-sm"
                                                style={{
                                                    left: `${bar.offsetPx}px`,
                                                    width: `${Math.max(6, bar.widthPx)}px`,
                                                    height: `${ganttRowHeight - 6}px`,
                                                    backgroundColor: bar.color,
                                                    opacity: 0.8,
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Task table */}
                {[...groupedTasks, ...(unphasedTasks.length > 0 ? [{ phase: null, tasks: unphasedTasks }] : [])].map((group, gi) => (
                    <div key={gi} className={gi > 0 ? "mt-6" : ""}>
                        {/* Phase header */}
                        {group.phase ? (
                            <div className="flex items-center gap-3 bg-slate-800 text-white px-4 py-2 rounded-t-xl">
                                {group.phase.color && (
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.phase.color }} />
                                )}
                                <h2 className="font-bold text-sm uppercase tracking-wide">{group.phase.name}</h2>
                                <span className="text-slate-400 text-xs ml-auto">{group.tasks.length} tasks</span>
                            </div>
                        ) : (
                            <div className="bg-slate-200 px-4 py-2 rounded-t-xl">
                                <h2 className="font-bold text-sm uppercase tracking-wide text-slate-600">Unphased Tasks</h2>
                            </div>
                        )}

                        <table className="w-full border border-slate-200 border-t-0 rounded-b-xl overflow-hidden text-xs">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-8">#</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 min-w-[200px]">Task Name</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-20">Duration</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-24">Start</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-24">Finish</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-20">Status</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-20">Progress</th>
                                    <th className="text-left px-3 py-2 font-semibold text-slate-600 w-28">Delay / Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.tasks.map((task, rowIdx) => {
                                    const isOverdue = task.planned_finish && task.planned_finish < today && task.status !== "done";
                                    const isCritical = isCriticalTask(task, tasks);
                                    const isBlocked = task.status === "blocked";

                                    let rowClass = rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                                    if (task.status === "done") rowClass = "bg-emerald-50";
                                    else if (isBlocked) rowClass = "bg-orange-50";
                                    else if (isCritical) rowClass = "bg-red-50";
                                    else if (isOverdue) rowClass = "bg-red-50/50";

                                    return (
                                        <tr key={task.id} className={`border-t border-slate-100 ${rowClass}`}>
                                            <td className="px-3 py-2 text-slate-400 font-mono">{rowIdx + 1}</td>
                                            <td className="px-3 py-2 font-medium text-slate-800" style={{ paddingLeft: `${12 + (task.indent_level ?? 0) * 12}px` }}>
                                                {task.is_milestone && <span className="text-purple-600 mr-1">◆</span>}
                                                {isCritical && <span className="text-red-600 mr-1 font-bold">★</span>}
                                                {task.title}
                                                {task.status === "done" && <span className="ml-1 text-emerald-600">✓</span>}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 font-mono">
                                                {task.duration_days != null ? `${task.duration_days}d` : "—"}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">
                                                {task.planned_start ? new Date(task.planned_start).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                                            </td>
                                            <td className={`px-3 py-2 ${isOverdue ? "text-red-600 font-bold" : "text-slate-600"}`}>
                                                {task.planned_finish ? new Date(task.planned_finish).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                                                {isOverdue && " ⚠"}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                          ${task.status === "done" ? "bg-emerald-100 text-emerald-800" :
                                                        task.status === "blocked" ? "bg-orange-100 text-orange-800" :
                                                            task.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                                                                "bg-slate-100 text-slate-600"}`}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[task.status] }} />
                                                    {task.status.replace("-", " ")}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden w-16">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{ width: `${task.percent_complete}%`, backgroundColor: STATUS_COLORS[task.status] }}
                                                        />
                                                    </div>
                                                    <span className="text-slate-500 font-mono text-[10px] w-7 text-right">{task.percent_complete}%</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-500">
                                                {isBlocked && <span className="block text-orange-700 font-semibold">🔴 BLOCKED</span>}
                                                {isCritical && <span className="block text-red-700 font-semibold">★ Critical</span>}
                                                {isOverdue && !isBlocked && <span className="block text-red-600 font-semibold">Overdue</span>}
                                                {task.delay_type && (
                                                    <span className="block capitalize text-slate-500">{task.delay_type.replace("-", " ")}</span>
                                                )}
                                                {task.notes && <span className="block truncate max-w-[120px] text-slate-400">{task.notes}</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}

                {/* Footer */}
                <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400 flex justify-between">
                    <span>Generated: {printDate} via SitePlan</span>
                    <span>{plan.name}</span>
                </div>
            </div>
        </>
    );
}
