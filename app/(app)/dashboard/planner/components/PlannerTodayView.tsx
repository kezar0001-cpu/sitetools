"use client";

import { useMemo, useState } from "react";
import { PlanTask, TaskStatus, STATUS_COLORS, DELAY_TYPES, DELAY_TYPE_LABELS, DelayType } from "@/lib/planner/types";

interface Props {
    tasks: PlanTask[];
    saving: string | null;
    onQuickUpdate: (task: PlanTask, status: TaskStatus, percent: number, note?: string) => Promise<void>;
    onLogDelay: (input: {
        task: PlanTask;
        delayType: DelayType;
        delayReason?: string;
        councilWaitingOn?: string;
        weatherHoursLost?: number;
    }) => Promise<void>;
}

function asDate(value: string | null) {
    return value ? new Date(value) : null;
}

export function PlannerTodayView({ tasks, saving, onQuickUpdate, onLogDelay }: Props) {
    const [selectedBucket, setSelectedBucket] = useState<"all" | "overdue" | "today" | "week">("all");
    const [delayModal, setDelayModal] = useState<PlanTask | null>(null);
    const [delayType, setDelayType] = useState<DelayType>("weather");
    const [delayNote, setDelayNote] = useState("");
    const [councilNote, setCouncilNote] = useState("");
    const [weatherHoursLost, setWeatherHoursLost] = useState("8");

    const today = useMemo(() => new Date(), []);
    const dateString = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const buckets = useMemo(() => {
        const dueToday: PlanTask[] = [];
        const overdue: PlanTask[] = [];
        const thisWeek: PlanTask[] = [];

        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);

        for (const task of tasks) {
            if (task.status === "done") continue;
            const due = asDate(task.planned_finish);
            if (!due) continue;

            if (due.toDateString() === today.toDateString()) dueToday.push(task);
            else if (due < today) overdue.push(task);
            else if (due <= weekEnd) thisWeek.push(task);
        }

        return { dueToday, overdue, thisWeek };
    }, [tasks, today]);

    const displayTasks = useMemo(() => {
        switch (selectedBucket) {
            case "overdue": return buckets.overdue;
            case "today": return buckets.dueToday;
            case "week": return buckets.thisWeek;
            default: return [...buckets.overdue, ...buckets.dueToday, ...buckets.thisWeek];
        }
    }, [selectedBucket, buckets]);

    // Council waiting items
    const councilItems = useMemo(
        () => tasks.filter((t) => t.delay_type === "council" && t.status !== "done"),
        [tasks]
    );

    const handleLogDelay = async (task: PlanTask) => {
        await onLogDelay({
            task,
            delayType,
            delayReason: delayNote || undefined,
            councilWaitingOn: delayType === "council" ? councilNote || undefined : undefined,
            weatherHoursLost: delayType === "weather" ? Number(weatherHoursLost) || 0 : undefined,
        });
        setDelayModal(null);
        setDelayNote("");
        setCouncilNote("");
        setWeatherHoursLost("8");
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">Today View</p>
                <h2 className="text-xl md:text-2xl font-black mt-1">{dateString}</h2>
                <p className="text-sm text-slate-400 mt-1">Mobile-friendly daily task manager for field updates.</p>

                {/* Bucket counters */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                        { key: "overdue" as const, label: "Overdue", count: buckets.overdue.length, color: "bg-red-500/20 text-red-300 border-red-500/30" },
                        { key: "today" as const, label: "Due Today", count: buckets.dueToday.length, color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                        { key: "week" as const, label: "This Week", count: buckets.thisWeek.length, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
                    ].map((b) => (
                        <button
                            key={b.key}
                            onClick={() => setSelectedBucket(selectedBucket === b.key ? "all" : b.key)}
                            className={`rounded-xl p-3 border text-left transition-all ${selectedBucket === b.key ? "ring-2 ring-amber-400 " + b.color : b.color + " opacity-80 hover:opacity-100"
                                }`}
                        >
                            <p className="text-2xl font-black">{b.count}</p>
                            <p className="text-xs font-medium mt-0.5">{b.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Council waiting section */}
            {councilItems.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <h3 className="font-bold text-orange-800 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Waiting on Council ({councilItems.length})
                    </h3>
                    <div className="mt-2 space-y-2">
                        {councilItems.map((task) => (
                            <div key={task.id} className="bg-white rounded-lg p-3 border border-orange-100">
                                <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                                {task.council_waiting_on && (
                                    <p className="text-xs text-orange-700 mt-1">
                                        <span className="font-medium">Outstanding:</span> {task.council_waiting_on}
                                    </p>
                                )}
                                {task.council_submitted_date && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Submitted: {new Date(task.council_submitted_date).toLocaleDateString("en-AU")}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task cards */}
            <div className="space-y-3">
                {displayTasks.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                        <p className="text-slate-400 text-sm">
                            {selectedBucket === "all"
                                ? "No tasks due. Looking good! 🎉"
                                : `No ${selectedBucket} tasks.`}
                        </p>
                    </div>
                )}

                {displayTasks.map((task) => {
                    const isSaving = saving === task.id;
                    const dueDate = asDate(task.planned_finish);
                    const isOverdue = dueDate && dueDate < today && task.status !== "done";

                    return (
                        <div
                            key={task.id}
                            className={`bg-white border rounded-xl p-4 transition-all ${isOverdue ? "border-red-300 shadow-red-100 shadow-sm" : "border-slate-200"
                                } ${isSaving ? "opacity-50" : ""}`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Status dot */}
                                <div
                                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                    style={{ backgroundColor: STATUS_COLORS[task.status] }}
                                />

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                                        <span>
                                            Due: {dueDate ? dueDate.toLocaleDateString("en-AU") : "No date"}
                                        </span>
                                        <span>{task.percent_complete}% complete</span>
                                        {task.duration_days != null && <span>{task.duration_days}d duration</span>}
                                        {task.actual_finish && task.planned_finish && (
                                            <span className={task.actual_finish.slice(0, 10) > task.planned_finish ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                                                {task.actual_finish.slice(0, 10) > task.planned_finish ? "Late vs plan" : "On/under plan"}
                                            </span>
                                        )}
                                        {task.delay_type && (
                                            <span className="text-red-600 font-medium">
                                                ⚠ {DELAY_TYPE_LABELS[task.delay_type]}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${task.percent_complete}%`,
                                                backgroundColor: STATUS_COLORS[task.status],
                                            }}
                                        />
                                    </div>

                                    {/* Quick actions */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => onQuickUpdate(task, "in-progress", Math.min(100, task.percent_complete + 25), "Progressed on site")}
                                            className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors disabled:opacity-40"
                                        >
                                            +25% Progress
                                        </button>
                                        <button
                                            disabled={isSaving}
                                            onClick={() => onQuickUpdate(task, "done", 100, "Completed on site")}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-40"
                                        >
                                            ✓ Done
                                        </button>
                                        <button
                                            disabled={isSaving}
                                            onClick={() => setDelayModal(task)}
                                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-40"
                                        >
                                            Log Delay
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Delay logging modal */}
            {delayModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-5 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Log Delay — {delayModal.title}</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Delay Type</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    value={delayType}
                                    onChange={(e) => setDelayType(e.target.value as DelayType)}
                                >
                                    {DELAY_TYPES.map((d) => (
                                        <option key={d} value={d}>
                                            {DELAY_TYPE_LABELS[d]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                                    value={delayNote}
                                    onChange={(e) => setDelayNote(e.target.value)}
                                    placeholder="Describe the delay reason..."
                                />
                            </div>

                            {delayType === "weather" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hours lost</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        value={weatherHoursLost}
                                        onChange={(e) => setWeatherHoursLost(e.target.value)}
                                    />
                                </div>
                            )}

                            {delayType === "council" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        What info is outstanding from council?
                                    </label>
                                    <textarea
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[60px]"
                                        value={councilNote}
                                        onChange={(e) => setCouncilNote(e.target.value)}
                                        placeholder="e.g. Road opening permit approval, DA condition clearance..."
                                    />
                                </div>
                            )}

                            {delayType === "weather" && (
                                <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-2">
                                    💧 Weather delays are also logged to the weather delay register for reporting.
                                </p>
                            )}

                            {delayType === "redesign" && (
                                <p className="text-xs text-slate-500 bg-purple-50 rounded-lg p-2">
                                    📐 Redesign delays track scope changes that require drawing or specification updates.
                                </p>
                            )}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex gap-3 justify-end">
                            <button
                                onClick={() => { setDelayModal(null); setDelayNote(""); setCouncilNote(""); setWeatherHoursLost("8"); }}
                                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleLogDelay(delayModal)}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                            >
                                Log Delay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
