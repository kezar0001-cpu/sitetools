"use client";

import { useCallback, useMemo, useState } from "react";
import {
    PlanTask,
    PlanPhase,
    TASK_STATUSES,
    TASK_PRIORITIES,
    TaskStatus,
    TaskPriority,
    DelayType,
    DELAY_TYPES,
    DELAY_TYPE_LABELS,
    STATUS_COLORS,
    PRIORITY_COLORS,
} from "@/lib/planner/types";
import { statusFromPercent } from "@/lib/planner/validation";

interface Props {
    tasks: PlanTask[];
    phases: PlanPhase[];
    saving: string | null;
    onAddTask: (title: string, phaseId?: string | null) => Promise<void>;
    onPatchTask: (taskId: string, patch: Partial<PlanTask>) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
}

type SortField = "sort_order" | "title" | "status" | "planned_start" | "planned_finish" | "percent_complete";
type FilterStatus = TaskStatus | "all";

export function PlannerSheetView({ tasks, phases, saving, onAddTask, onPatchTask, onDeleteTask }: Props) {
    const [newTitle, setNewTitle] = useState("");
    const [newPhaseId, setNewPhaseId] = useState<string>("");
    const [sortField, setSortField] = useState<SortField>("sort_order");
    const [sortAsc, setSortAsc] = useState(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [filterPhase, setFilterPhase] = useState<string>("all");
    const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
    const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
    const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({});

    // ── Sorting ──
    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    }, [sortField, sortAsc]);

    // ── Filtering + Sorting ──
    const processedTasks = useMemo(() => {
        let filtered = [...tasks];

        if (filterStatus !== "all") {
            filtered = filtered.filter((t) => t.status === filterStatus);
        }
        if (filterPhase !== "all") {
            filtered = filtered.filter((t) => (t.phase_id ?? "none") === filterPhase);
        }

        filtered.sort((a, b) => {
            let aVal: string | number = 0;
            let bVal: string | number = 0;

            switch (sortField) {
                case "title": aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
                case "status": aVal = a.status; bVal = b.status; break;
                case "planned_start": aVal = a.planned_start ?? ""; bVal = b.planned_start ?? ""; break;
                case "planned_finish": aVal = a.planned_finish ?? ""; bVal = b.planned_finish ?? ""; break;
                case "percent_complete": aVal = a.percent_complete; bVal = b.percent_complete; break;
                default: aVal = a.sort_order; bVal = b.sort_order;
            }

            if (aVal < bVal) return sortAsc ? -1 : 1;
            if (aVal > bVal) return sortAsc ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [tasks, filterStatus, filterPhase, sortField, sortAsc]);

    // ── Phase grouping ──
    const groupedByPhase = useMemo(() => {
        const phaseMap = new Map<string, { phase: PlanPhase | null; tasks: PlanTask[] }>();

        // Initialize with phases
        for (const phase of phases) {
            phaseMap.set(phase.id, { phase, tasks: [] });
        }
        phaseMap.set("none", { phase: null, tasks: [] });

        for (const task of processedTasks) {
            const key = task.phase_id ?? "none";
            const group = phaseMap.get(key);
            if (group) {
                group.tasks.push(task);
            } else {
                phaseMap.set(key, { phase: null, tasks: [task] });
            }
        }

        return Array.from(phaseMap.entries())
            .filter(([, g]) => g.tasks.length > 0 || g.phase !== null)
            .sort(([, a], [, b]) => (a.phase?.sort_order ?? 999) - (b.phase?.sort_order ?? 999));
    }, [processedTasks, phases]);

    const togglePhaseCollapse = (phaseId: string) => {
        setCollapsedPhases((prev) => {
            const next = new Set(prev);
            if (next.has(phaseId)) next.delete(phaseId);
            else next.add(phaseId);
            return next;
        });
    };

    // ── Inline editing helpers ──
    const getLocalValue = (taskId: string, field: string, fallback: string) => {
        return localValues[taskId]?.[field] ?? fallback;
    };

    const setLocalValue = (taskId: string, field: string, value: string) => {
        setLocalValues((prev) => ({
            ...prev,
            [taskId]: { ...prev[taskId], [field]: value },
        }));
    };

    const commitEdit = async (taskId: string, field: string, value: string, task: PlanTask) => {
        setEditingCell(null);
        const cleanLocal = { ...localValues };
        delete cleanLocal[taskId];
        setLocalValues(cleanLocal);

        switch (field) {
            case "title":
                if (value !== task.title) await onPatchTask(taskId, { title: value });
                break;
            case "planned_start":
                if (value !== (task.planned_start ?? "")) await onPatchTask(taskId, { planned_start: value || null });
                break;
            case "planned_finish":
                if (value !== (task.planned_finish ?? "")) await onPatchTask(taskId, { planned_finish: value || null });
                break;
            case "notes":
                if (value !== (task.notes ?? "")) await onPatchTask(taskId, { notes: value || null });
                break;
            case "council_waiting_on":
                if (value !== (task.council_waiting_on ?? "")) await onPatchTask(taskId, { council_waiting_on: value || null });
                break;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, taskId: string, field: string, value: string, task: PlanTask) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commitEdit(taskId, field, value, task);
        }
        if (e.key === "Escape") {
            setEditingCell(null);
            const cleanLocal = { ...localValues };
            delete cleanLocal[taskId];
            setLocalValues(cleanLocal);
        }
    };

    // ── Quick add ──
    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        await onAddTask(newTitle.trim(), newPhaseId || null);
        setNewTitle("");
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1 text-[10px] opacity-50">
            {sortField === field ? (sortAsc ? "▲" : "▼") : "⇅"}
        </span>
    );

    // ── Duration display ──
    const durationDisplay = (task: PlanTask) => {
        if (task.is_milestone) return "0 (Milestone)";
        if (task.duration_days !== null && task.duration_days !== undefined) return `${task.duration_days}d`;
        return "—";
    };

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                    <label className="font-medium text-slate-600">Status:</label>
                    <select
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    >
                        <option value="all">All</option>
                        {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s.replace("-", " ")}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <label className="font-medium text-slate-600">Phase:</label>
                    <select
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                        value={filterPhase}
                        onChange={(e) => setFilterPhase(e.target.value)}
                    >
                        <option value="all">All</option>
                        {phases.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                        <option value="none">Unphased</option>
                    </select>
                </div>

                <div className="ml-auto text-xs text-slate-500">
                    {processedTasks.length} task{processedTasks.length !== 1 ? "s" : ""}
                    {filterStatus !== "all" || filterPhase !== "all" ? " (filtered)" : ""}
                </div>
            </div>

            {/* Sheet table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1200px]">
                        <thead>
                            <tr className="bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                                <th className="w-10 p-2 text-center text-slate-400 font-medium text-xs">#</th>
                                <th className="text-left p-2 cursor-pointer select-none min-w-[240px]" onClick={() => handleSort("title")}>
                                    <span className="font-semibold text-slate-700">Task</span><SortIcon field="title" />
                                </th>
                                <th className="text-left p-2 w-24">
                                    <span className="font-semibold text-slate-700">Duration</span>
                                </th>
                                <th className="text-left p-2 cursor-pointer select-none w-28" onClick={() => handleSort("planned_start")}>
                                    <span className="font-semibold text-slate-700">Start</span><SortIcon field="planned_start" />
                                </th>
                                <th className="text-left p-2 cursor-pointer select-none w-28" onClick={() => handleSort("planned_finish")}>
                                    <span className="font-semibold text-slate-700">Finish</span><SortIcon field="planned_finish" />
                                </th>
                                <th className="text-left p-2 cursor-pointer select-none w-24" onClick={() => handleSort("status")}>
                                    <span className="font-semibold text-slate-700">Status</span><SortIcon field="status" />
                                </th>
                                <th className="text-left p-2 cursor-pointer select-none w-20" onClick={() => handleSort("percent_complete")}>
                                    <span className="font-semibold text-slate-700">%</span><SortIcon field="percent_complete" />
                                </th>
                                <th className="text-left p-2 w-24">
                                    <span className="font-semibold text-slate-700">Priority</span>
                                </th>
                                <th className="text-left p-2 w-28">
                                    <span className="font-semibold text-slate-700">Delay</span>
                                </th>
                                <th className="text-left p-2 min-w-[160px]">
                                    <span className="font-semibold text-slate-700">Notes</span>
                                </th>
                                <th className="w-10 p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedByPhase.map(([phaseId, { phase, tasks: phaseTasks }]) => {
                                const isCollapsed = collapsedPhases.has(phaseId);
                                return (
                                    <PhaseGroup
                                        key={phaseId}
                                        phase={phase}
                                        tasks={phaseTasks}
                                        isCollapsed={isCollapsed}
                                        onToggle={() => togglePhaseCollapse(phaseId)}
                                        saving={saving}
                                        editingCell={editingCell}
                                        getLocalValue={getLocalValue}
                                        setLocalValue={setLocalValue}
                                        setEditingCell={setEditingCell}
                                        commitEdit={commitEdit}
                                        handleKeyDown={handleKeyDown}
                                        onPatchTask={onPatchTask}
                                        onDeleteTask={onDeleteTask}
                                        durationDisplay={durationDisplay}
                                        allTasks={tasks}
                                    />
                                );
                            })}

                            {/* Quick add row */}
                            <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                                <td className="p-2 text-center">
                                    <span className="text-slate-300 text-lg">+</span>
                                </td>
                                <td className="p-2" colSpan={2}>
                                    <input
                                        className="w-full border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm bg-white placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition-colors"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                        placeholder="Quick add activity… (Enter to add)"
                                    />
                                </td>
                                <td className="p-2" colSpan={2}>
                                    <select
                                        className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white w-full"
                                        value={newPhaseId}
                                        onChange={(e) => setNewPhaseId(e.target.value)}
                                    >
                                        <option value="">No phase</option>
                                        {phases.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-2" colSpan={6}>
                                    <button
                                        disabled={!newTitle.trim() || saving === "new"}
                                        onClick={handleAdd}
                                        className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm disabled:opacity-40 hover:bg-amber-400 transition-colors"
                                    >
                                        {saving === "new" ? "Adding..." : "Add row"}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Phase Group Sub-component ──

function PhaseGroup({
    phase,
    tasks,
    isCollapsed,
    onToggle,
    saving,
    editingCell,
    getLocalValue,
    setLocalValue,
    setEditingCell,
    commitEdit,
    handleKeyDown,
    onPatchTask,
    onDeleteTask,
    durationDisplay,
    allTasks,
}: {
    phase: PlanPhase | null;
    tasks: PlanTask[];
    isCollapsed: boolean;
    onToggle: () => void;
    saving: string | null;
    editingCell: { taskId: string; field: string } | null;
    getLocalValue: (taskId: string, field: string, fallback: string) => string;
    setLocalValue: (taskId: string, field: string, value: string) => void;
    setEditingCell: (v: { taskId: string; field: string } | null) => void;
    commitEdit: (taskId: string, field: string, value: string, task: PlanTask) => Promise<void>;
    handleKeyDown: (e: React.KeyboardEvent, taskId: string, field: string, value: string, task: PlanTask) => void;
    onPatchTask: (taskId: string, patch: Partial<PlanTask>) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
    durationDisplay: (task: PlanTask) => string;
    allTasks: PlanTask[];
}) {
    // Find the row number relative to allTasks
    const getRowNumber = (task: PlanTask) => allTasks.findIndex((t) => t.id === task.id) + 1;

    return (
        <>
            {phase && (
                <tr className="bg-gradient-to-r from-slate-800 to-slate-700 cursor-pointer group" onClick={onToggle}>
                    <td className="p-2 text-center">
                        <span className="text-white text-xs">{isCollapsed ? "▸" : "▾"}</span>
                    </td>
                    <td className="p-2" colSpan={10}>
                        <div className="flex items-center gap-3">
                            {phase.color && (
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                            )}
                            <span className="font-bold text-white text-sm tracking-wide">{phase.name}</span>
                            <span className="text-xs text-slate-400 font-medium">
                                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </td>
                </tr>
            )}

            {!isCollapsed &&
                tasks.map((task) => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        rowNumber={getRowNumber(task)}
                        saving={saving}
                        editingCell={editingCell}
                        getLocalValue={getLocalValue}
                        setLocalValue={setLocalValue}
                        setEditingCell={setEditingCell}
                        commitEdit={commitEdit}
                        handleKeyDown={handleKeyDown}
                        onPatchTask={onPatchTask}
                        onDeleteTask={onDeleteTask}
                        durationDisplay={durationDisplay}
                    />
                ))}
        </>
    );
}

// ── Individual Task Row ──

function TaskRow({
    task,
    rowNumber,
    saving,
    editingCell,
    getLocalValue,
    setLocalValue,
    setEditingCell,
    commitEdit,
    handleKeyDown,
    onPatchTask,
    onDeleteTask,
    durationDisplay,
}: {
    task: PlanTask;
    rowNumber: number;
    saving: string | null;
    editingCell: { taskId: string; field: string } | null;
    getLocalValue: (taskId: string, field: string, fallback: string) => string;
    setLocalValue: (taskId: string, field: string, value: string) => void;
    setEditingCell: (v: { taskId: string; field: string } | null) => void;
    commitEdit: (taskId: string, field: string, value: string, task: PlanTask) => Promise<void>;
    handleKeyDown: (e: React.KeyboardEvent, taskId: string, field: string, value: string, task: PlanTask) => void;
    onPatchTask: (taskId: string, patch: Partial<PlanTask>) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
    durationDisplay: (task: PlanTask) => string;
}) {
    const isEditing = (field: string) => editingCell?.taskId === task.id && editingCell?.field === field;
    const isSaving = saving === task.id;
    const indentPx = (task.indent_level ?? 0) * 20;

    return (
        <tr
            className={`border-t border-slate-100 hover:bg-amber-50/30 transition-colors ${task.status === "done" ? "opacity-60" : ""
                } ${task.is_milestone ? "bg-purple-50/30" : ""} ${isSaving ? "opacity-50" : ""}`}
        >
            {/* Row number */}
            <td className="p-2 text-center text-xs text-slate-400 font-mono">{rowNumber}</td>

            {/* Title - click to edit */}
            <td className="p-2" style={{ paddingLeft: `${8 + indentPx}px` }}>
                {task.is_milestone && <span className="mr-1.5 text-purple-500">◆</span>}
                {isEditing("title") ? (
                    <input
                        autoFocus
                        className="w-full border border-amber-400 rounded px-2 py-1 text-sm bg-amber-50 outline-none"
                        value={getLocalValue(task.id, "title", task.title)}
                        onChange={(e) => setLocalValue(task.id, "title", e.target.value)}
                        onBlur={() => commitEdit(task.id, "title", getLocalValue(task.id, "title", task.title), task)}
                        onKeyDown={(e) => handleKeyDown(e, task.id, "title", getLocalValue(task.id, "title", task.title), task)}
                    />
                ) : (
                    <span
                        className="cursor-text hover:bg-slate-100 rounded px-2 py-1 -mx-2 inline-block min-w-[100px]"
                        onClick={() => { setEditingCell({ taskId: task.id, field: "title" }); setLocalValue(task.id, "title", task.title); }}
                    >
                        {task.title}
                    </span>
                )}
            </td>

            {/* Duration */}
            <td className="p-2 text-sm text-slate-600 font-mono">
                {durationDisplay(task)}
            </td>

            {/* Start date */}
            <td className="p-2">
                <input
                    type="date"
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white hover:border-slate-400 focus:border-amber-400 outline-none transition-colors w-full"
                    value={task.planned_start ?? ""}
                    onChange={(e) => onPatchTask(task.id, { planned_start: e.target.value || null })}
                />
            </td>

            {/* Finish date */}
            <td className="p-2">
                <input
                    type="date"
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white hover:border-slate-400 focus:border-amber-400 outline-none transition-colors w-full"
                    value={task.planned_finish ?? ""}
                    onChange={(e) => onPatchTask(task.id, { planned_finish: e.target.value || null })}
                />
            </td>

            {/* Status */}
            <td className="p-2">
                <div className="relative">
                    <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[task.status] }}
                    />
                    <select
                        className="pl-6 pr-2 py-1 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-400 outline-none transition-colors w-full appearance-none"
                        value={task.status}
                        onChange={(e) => onPatchTask(task.id, { status: e.target.value as TaskStatus })}
                    >
                        {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s.replace("-", " ")}
                            </option>
                        ))}
                    </select>
                </div>
            </td>

            {/* Percent complete */}
            <td className="p-2">
                <div className="flex items-center gap-1">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${task.percent_complete}%`,
                                backgroundColor: STATUS_COLORS[task.status],
                            }}
                        />
                    </div>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-12 border border-slate-200 rounded px-1 py-0.5 text-xs text-center bg-white outline-none"
                        value={task.percent_complete}
                        onChange={(e) =>
                            onPatchTask(task.id, {
                                percent_complete: Number(e.target.value),
                                status: statusFromPercent(Number(e.target.value), task.status),
                            })
                        }
                    />
                </div>
            </td>

            {/* Priority */}
            <td className="p-2">
                <select
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white hover:border-slate-400 outline-none transition-colors w-full"
                    value={task.priority}
                    style={{ color: PRIORITY_COLORS[task.priority] }}
                    onChange={(e) => onPatchTask(task.id, { priority: e.target.value as TaskPriority })}
                >
                    {TASK_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                            {p}
                        </option>
                    ))}
                </select>
            </td>

            {/* Delay type */}
            <td className="p-2">
                <select
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white hover:border-slate-400 outline-none transition-colors w-full"
                    value={task.delay_type ?? ""}
                    onChange={(e) => onPatchTask(task.id, { delay_type: (e.target.value || null) as DelayType | null })}
                >
                    <option value="">None</option>
                    {DELAY_TYPES.map((d) => (
                        <option key={d} value={d}>
                            {DELAY_TYPE_LABELS[d]}
                        </option>
                    ))}
                </select>
            </td>

            {/* Notes */}
            <td className="p-2">
                {isEditing("notes") ? (
                    <textarea
                        autoFocus
                        rows={2}
                        className="w-full border border-amber-400 rounded px-2 py-1 text-sm bg-amber-50 outline-none resize-none"
                        value={getLocalValue(task.id, "notes", task.notes ?? "")}
                        onChange={(e) => setLocalValue(task.id, "notes", e.target.value)}
                        onBlur={() => commitEdit(task.id, "notes", getLocalValue(task.id, "notes", task.notes ?? ""), task)}
                    />
                ) : (
                    <span
                        className="cursor-text text-sm text-slate-500 hover:bg-slate-100 rounded px-2 py-1 -mx-2 inline-block min-w-[60px] min-h-[24px] truncate max-w-[200px]"
                        onClick={() => { setEditingCell({ taskId: task.id, field: "notes" }); setLocalValue(task.id, "notes", task.notes ?? ""); }}
                        title={task.notes ?? "Click to add notes"}
                    >
                        {task.notes || "—"}
                    </span>
                )}
            </td>

            {/* Delete */}
            <td className="p-2 text-center">
                <button
                    onClick={() => { if (confirm("Delete this task?")) onDeleteTask(task.id); }}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                    title="Delete task"
                >
                    ✕
                </button>
            </td>
        </tr>
    );
}
