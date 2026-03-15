"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  PlanPhase,
  PlanTask,
  TaskStatus,
  DelayType,
  DELAY_TYPES,
  DELAY_TYPE_LABELS,
} from "@/lib/planner/types";

// ── Status config ──
const STATUS_CYCLE: TaskStatus[] = ["not-started", "in-progress", "blocked", "done"];

const STATUS_CFG: Record<TaskStatus, { label: string; pill: string; dot: string }> = {
  "not-started": { label: "Not Started", pill: "bg-slate-100 text-slate-600 border-slate-200",   dot: "bg-slate-400"   },
  "in-progress": { label: "In Progress", pill: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500"    },
  "blocked":     { label: "Blocked",     pill: "bg-red-100 text-red-700 border-red-200",           dot: "bg-red-500"     },
  "done":        { label: "Done",        pill: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

type Bucket = "all" | "overdue" | "today" | "week" | "unscheduled";

interface Props {
  tasks: PlanTask[];
  phases: PlanPhase[];
  saving: string | null;
  currentUserId?: string | null;
  onQuickUpdate: (task: PlanTask, status: TaskStatus, percent: number, note?: string) => Promise<void>;
  onLogDelay: (input: {
    task: PlanTask;
    delayType: DelayType;
    delayReason?: string;
    councilWaitingOn?: string;
    weatherHoursLost?: number;
  }) => Promise<void>;
}

// ── Weather Day bottom-sheet ──
function WeatherDaySheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (hours: number, note: string) => void;
}) {
  const [hours, setHours] = useState("8");
  const [note, setNote] = useState("");

  const submit = () => {
    onSubmit(Number(hours) || 8, note);
    setHours("8");
    setNote("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 animate-slide-up">
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-xl">🌧</div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Log Weather Day</h3>
            <p className="text-xs text-slate-500">Logged to the weather delay register</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Hours lost today
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="flex-1 h-2 accent-blue-500"
              />
              <span className="w-14 text-center font-black text-lg text-blue-600">
                {hours}h
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
              <span>0h</span>
              <span>Full day (10h)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Weather notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-colors resize-none"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Heavy rain, site too wet to operate..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-600 font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            Log {hours}h
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delay bottom-sheet ──
function DelaySheet({
  task,
  onClose,
  onSubmit,
}: {
  task: PlanTask | null;
  onClose: () => void;
  onSubmit: (delayType: DelayType, note: string, councilNote: string, hours: number) => void;
}) {
  const [delayType, setDelayType] = useState<DelayType>("weather");
  const [note, setNote] = useState("");
  const [councilNote, setCouncilNote] = useState("");
  const [hours, setHours] = useState("8");

  const reset = () => {
    setDelayType("weather");
    setNote("");
    setCouncilNote("");
    setHours("8");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(delayType, note, councilNote, Number(hours) || 0);
    reset();
  };

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-h-[88vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5 flex-shrink-0" />
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-xl flex-shrink-0">⚠</div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base">Log Delay</h3>
            <p className="text-xs text-slate-500 truncate">{task.title}</p>
          </div>
        </div>

        {/* Delay type pills */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Delay Type</p>
          <div className="flex flex-wrap gap-2">
            {DELAY_TYPES.map((dt) => (
              <button
                key={dt}
                onClick={() => setDelayType(dt)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  delayType === dt
                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {DELAY_TYPE_LABELS[dt]}
              </button>
            ))}
          </div>
        </div>

        {/* Weather hours */}
        {delayType === "weather" && (
          <div className="mb-4 bg-blue-50 rounded-2xl p-4">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Hours lost</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="flex-1 h-2 accent-blue-600"
              />
              <span className="w-12 text-center font-black text-blue-700">{hours}h</span>
            </div>
          </div>
        )}

        {/* Council waiting on */}
        {delayType === "council" && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              What is outstanding from council?
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none resize-none"
              rows={2}
              value={councilNote}
              onChange={(e) => setCouncilNote(e.target.value)}
              placeholder="e.g. Road opening permit, DA condition clearance..."
            />
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm placeholder-slate-400 focus:border-red-300 focus:ring-1 focus:ring-red-100 outline-none resize-none"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the delay cause and impact..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-600 font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Log Delay
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task card ──
function SiteTaskCard({
  task,
  phase,
  isSaving,
  today,
  onStatusCycle,
  onProgressChange,
  onLogDelay,
}: {
  task: PlanTask;
  phase: PlanPhase | null;
  isSaving: boolean;
  today: Date;
  onStatusCycle: () => void;
  onProgressChange: (pct: number) => void;
  onLogDelay: () => void;
}) {
  const sc = STATUS_CFG[task.status];
  const phaseColor = phase?.color ?? "#94a3b8";
  const dueDate = task.planned_finish ? new Date(task.planned_finish) : null;
  const isOverdue = dueDate && dueDate < today && task.status !== "done";
  const isDoneOrNA = task.status === "done";

  const dueFmt = dueDate
    ? dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : null;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${
        isOverdue ? "border-red-200 shadow-red-50" : "border-slate-200"
      } ${isSaving ? "opacity-50" : ""}`}
      style={{ borderLeftColor: phaseColor, borderLeftWidth: 4 }}
    >
      <div className="p-4">
        {/* Phase label */}
        {phase && (
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: phaseColor }}>
            {phase.name}
          </p>
        )}

        {/* Title + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className={`font-bold text-slate-900 text-sm leading-snug flex-1 ${isDoneOrNA ? "line-through opacity-60" : ""}`}>
            {task.title}
          </h4>
          <button
            onClick={onStatusCycle}
            disabled={isSaving}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all min-h-[36px] ${sc.pill}`}
            title="Tap to change status"
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
            {sc.label}
          </button>
        </div>

        {/* Progress slider */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-medium">Progress</span>
            <span className="text-xs font-black text-slate-700">{task.percent_complete}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={task.percent_complete}
            disabled={isSaving || isDoneOrNA}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer disabled:opacity-40"
            style={{ accentColor: phaseColor }}
          />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {dueFmt && (
              <span className={isOverdue ? "text-red-500 font-semibold" : ""}>
                {isOverdue ? "⚠ " : ""}Due {dueFmt}
              </span>
            )}
            {task.duration_days != null && (
              <span>{task.duration_days}d</span>
            )}
          </div>
          <button
            onClick={onLogDelay}
            disabled={isSaving}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors min-h-[36px] disabled:opacity-40"
          >
            Log Delay
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──
export function PlannerTodayView({ tasks, phases, saving, currentUserId, onQuickUpdate, onLogDelay }: Props) {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [delayTask, setDelayTask] = useState<PlanTask | null>(null);
  const [showWeatherSheet, setShowWeatherSheet] = useState(false);
  // Track local progress changes before committing
  const pendingProgress = useRef<Map<string, number>>(new Map());
  const commitTimer = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    return d;
  }, [today]);

  const phaseMap = useMemo(() => {
    const m = new Map<string, PlanPhase>();
    for (const p of phases) m.set(p.id, p);
    return m;
  }, [phases]);

  const buckets = useMemo(() => {
    const overdue: PlanTask[] = [];
    const todayTasks: PlanTask[] = [];
    const thisWeek: PlanTask[] = [];
    const unscheduled: PlanTask[] = [];
    const active = tasks.filter((t) => {
      if (t.status === "done") return false;
      if (myTasksOnly && currentUserId) return t.assigned_to === currentUserId;
      return true;
    });

    for (const task of active) {
      const due = task.planned_finish ? new Date(task.planned_finish) : null;
      if (!due) { unscheduled.push(task); continue; }
      due.setHours(0, 0, 0, 0);
      if (due < today) overdue.push(task);
      else if (due.getTime() === today.getTime()) todayTasks.push(task);
      else if (due <= weekEnd) thisWeek.push(task);
    }

    return { overdue, today: todayTasks, week: thisWeek, unscheduled };
  }, [tasks, today, weekEnd]);

  const displayTasks = useMemo(() => {
    switch (bucket) {
      case "overdue":     return buckets.overdue;
      case "today":       return buckets.today;
      case "week":        return buckets.week;
      case "unscheduled": return buckets.unscheduled;
      default:
        return [...buckets.overdue, ...buckets.today, ...buckets.week];
    }
  }, [bucket, buckets]);

  const councilTasks = useMemo(
    () => tasks.filter((t) => t.delay_type === "council" && t.status !== "done"),
    [tasks]
  );

  // Status cycle on tap
  const handleStatusCycle = useCallback(async (task: PlanTask) => {
    const idx = STATUS_CYCLE.indexOf(task.status);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    const nextPct = nextStatus === "done" ? 100 : task.percent_complete;
    await onQuickUpdate(task, nextStatus, nextPct);
  }, [onQuickUpdate]);

  // Debounced progress slider commit
  const handleProgressChange = useCallback((task: PlanTask, pct: number) => {
    pendingProgress.current.set(task.id, pct);
    const existing = commitTimer.current.get(task.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      const finalPct = pendingProgress.current.get(task.id) ?? pct;
      pendingProgress.current.delete(task.id);
      commitTimer.current.delete(task.id);
      const status: TaskStatus = finalPct >= 100 ? "done" : finalPct > 0 ? "in-progress" : task.status;
      await onQuickUpdate(task, status, finalPct);
    }, 800);
    commitTimer.current.set(task.id, timer);
  }, [onQuickUpdate]);

  const handleDelaySubmit = useCallback(async (
    delayType: DelayType,
    note: string,
    councilNote: string,
    hours: number,
  ) => {
    if (!delayTask) return;
    await onLogDelay({
      task: delayTask,
      delayType,
      delayReason: note || undefined,
      councilWaitingOn: delayType === "council" ? councilNote || undefined : undefined,
      weatherHoursLost: delayType === "weather" ? hours : undefined,
    });
    setDelayTask(null);
  }, [delayTask, onLogDelay]);

  const handleWeatherSubmit = useCallback(async (hours: number, note: string) => {
    // Log weather against the first in-progress task (or none — just site-level)
    const pivot = tasks.find((t) => t.status === "in-progress") ?? tasks[0];
    if (!pivot) return;
    await onLogDelay({
      task: pivot,
      delayType: "weather",
      delayReason: note || undefined,
      weatherHoursLost: hours,
    });
    setShowWeatherSheet(false);
  }, [tasks, onLogDelay]);

  const dateLabel = today.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative min-h-screen">
      {/* ── Date header ── */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Site View</p>
          <h2 className="text-xl font-black text-slate-900">{dateLabel}</h2>
        </div>
        {currentUserId && (
          <button
            onClick={() => setMyTasksOnly(v => !v)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all mt-1 ${
              myTasksOnly
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            <span>👤</span>
            My Tasks
          </button>
        )}
      </div>

      {/* ── Bucket stats row ── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { key: "overdue" as Bucket,     label: "Overdue",  count: buckets.overdue.length,     color: "text-red-600",    bg: "bg-red-50 border-red-200"    },
          { key: "today" as Bucket,       label: "Today",    count: buckets.today.length,        color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
          { key: "week" as Bucket,        label: "Week",     count: buckets.week.length,         color: "text-blue-600",   bg: "bg-blue-50 border-blue-200"   },
          { key: "unscheduled" as Bucket, label: "No Date",  count: buckets.unscheduled.length,  color: "text-slate-500",  bg: "bg-slate-50 border-slate-200" },
        ].map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(bucket === b.key ? "all" : b.key)}
            className={`rounded-2xl border p-3 text-center transition-all ${b.bg} ${
              bucket === b.key ? "ring-2 ring-offset-1 ring-slate-900 shadow-md" : "hover:shadow-sm"
            }`}
          >
            <p className={`text-2xl font-black leading-none ${b.color}`}>{b.count}</p>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{b.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-4 pb-0.5">
        {[
          { key: "all" as Bucket,         label: `All Active (${buckets.overdue.length + buckets.today.length + buckets.week.length})` },
          { key: "overdue" as Bucket,     label: `Overdue (${buckets.overdue.length})` },
          { key: "today" as Bucket,       label: `Today (${buckets.today.length})` },
          { key: "week" as Bucket,        label: `This Week (${buckets.week.length})` },
          { key: "unscheduled" as Bucket, label: `No Date (${buckets.unscheduled.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setBucket(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              bucket === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Council waiting banner ── */}
      {councilTasks.length > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <p className="font-bold text-orange-800 text-sm">
              Waiting on Council ({councilTasks.length})
            </p>
          </div>
          <div className="space-y-2">
            {councilTasks.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-orange-100 px-3 py-2">
                <p className="font-semibold text-slate-800 text-sm">{t.title}</p>
                {t.council_waiting_on && (
                  <p className="text-xs text-orange-700 mt-0.5">
                    Outstanding: {t.council_waiting_on}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Task list ── */}
      <div className="space-y-3 pb-28">
        {displayTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="font-bold text-slate-700">
              {bucket === "all" ? "No active tasks due" : `No ${bucket} tasks`}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {bucket === "all"
                ? "All tasks are up to date — great work!"
                : "Switch to 'All' to see everything."}
            </p>
          </div>
        ) : (
          displayTasks.map((task) => (
            <SiteTaskCard
              key={task.id}
              task={task}
              phase={task.phase_id ? phaseMap.get(task.phase_id) ?? null : null}
              isSaving={saving === task.id}
              today={today}
              onStatusCycle={() => handleStatusCycle(task)}
              onProgressChange={(pct) => handleProgressChange(task, pct)}
              onLogDelay={() => setDelayTask(task)}
            />
          ))
        )}
      </div>

      {/* ── Weather Day FAB ── */}
      <button
        onClick={() => setShowWeatherSheet(true)}
        className="fixed bottom-6 right-4 z-40 flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-95"
      >
        <span className="text-base">🌧</span>
        Weather Day
      </button>

      {/* ── Delay bottom sheet ── */}
      <DelaySheet
        task={delayTask}
        onClose={() => setDelayTask(null)}
        onSubmit={handleDelaySubmit}
      />

      {/* ── Weather day bottom sheet ── */}
      <WeatherDaySheet
        open={showWeatherSheet}
        onClose={() => setShowWeatherSheet(false)}
        onSubmit={handleWeatherSubmit}
      />
    </div>
  );
}
