import type { TaskStatus, ProjectHealth } from "@/types/siteplan";

// ─── Status badge styles ─────────────────────────────────────
// Used in StatusBadge component and as the canonical badge palette.

export const STATUS_BADGE_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  delayed: "bg-red-100 text-red-700",
  on_hold: "bg-amber-100 text-amber-700",
};

// Lighter variant used in compact task-row inline badges.
export const STATUS_TASK_BADGE_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  delayed: "bg-red-50 text-red-700",
  on_hold: "bg-amber-50 text-amber-700",
};

// Inverted palette used on dark phase rows.
export const STATUS_PHASE_BADGE_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-slate-600 text-slate-200",
  in_progress: "bg-blue-500/20 text-blue-200",
  completed: "bg-green-500/20 text-green-200",
  delayed: "bg-red-500/20 text-red-200",
  on_hold: "bg-amber-500/20 text-amber-200",
};

// ─── Status dot colors ───────────────────────────────────────
// Used as small circular indicators inside badges or standalone.

export const STATUS_DOT_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
  on_hold: "bg-amber-500",
};

// ─── Status bar colors (hex, for SVG / canvas) ───────────────
// Used in GanttChart SVG bars.

export const STATUS_BAR_COLORS: Record<
  TaskStatus,
  { bg: string; progress: string }
> = {
  not_started: { bg: "#cbd5e1", progress: "#94a3b8" },
  in_progress: { bg: "#93c5fd", progress: "#3b82f6" },
  completed: { bg: "#86efac", progress: "#22c55e" },
  delayed: { bg: "#fca5a5", progress: "#ef4444" },
  on_hold: { bg: "#fcd34d", progress: "#f59e0b" },
};

// ─── Status timeline colors (hex + badge, for MilestoneTimeline) ─

export const STATUS_TIMELINE_COLORS: Record<
  TaskStatus,
  { track: string; fill: string; text: string; dot: string; badge: string }
> = {
  not_started: {
    track: "#e2e8f0",
    fill: "#94a3b8",
    text: "#475569",
    dot: "#94a3b8",
    badge: "bg-slate-100 text-slate-600",
  },
  in_progress: {
    track: "#bfdbfe",
    fill: "#3b82f6",
    text: "#1d4ed8",
    dot: "#3b82f6",
    badge: "bg-blue-100 text-blue-700",
  },
  completed: {
    track: "#bbf7d0",
    fill: "#22c55e",
    text: "#15803d",
    dot: "#22c55e",
    badge: "bg-green-100 text-green-700",
  },
  delayed: {
    track: "#fecaca",
    fill: "#ef4444",
    text: "#b91c1c",
    dot: "#ef4444",
    badge: "bg-red-100 text-red-700",
  },
  on_hold: {
    track: "#fde68a",
    fill: "#f59e0b",
    text: "#92400e",
    dot: "#f59e0b",
    badge: "bg-amber-100 text-amber-700",
  },
};

// ─── Health badge styles ─────────────────────────────────────

export const HEALTH_BADGE_STYLES: Record<
  ProjectHealth,
  { cls: string; label: string }
> = {
  on_track: { cls: "bg-green-100 text-green-700", label: "On Track" },
  at_risk: { cls: "bg-amber-100 text-amber-700", label: "At Risk" },
  delayed: { cls: "bg-red-100 text-red-700", label: "Delayed" },
};

// ─── Phase row colors ─────────────────────────────────────────
// Applied cyclically to phase rows in the task list.
// PHASE_BG_COLORS: full-row background band (Tailwind bg class).
// PHASE_ACCENT_COLORS: stronger left-border accent to complement the bg.

export const PHASE_BG_COLORS = [
  "bg-indigo-600",
  "bg-violet-600",
  "bg-emerald-700",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
];

export const PHASE_ACCENT_COLORS = [
  "border-l-indigo-300",
  "border-l-violet-300",
  "border-l-emerald-300",
  "border-l-amber-300",
  "border-l-rose-300",
  "border-l-sky-300",
];
