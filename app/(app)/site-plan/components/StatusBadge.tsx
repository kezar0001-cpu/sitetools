"use client";

import type { TaskStatus, ProjectHealth } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";

const statusStyles: Record<TaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  delayed: "bg-red-100 text-red-700",
  on_hold: "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const healthStyles: Record<ProjectHealth, { cls: string; label: string }> = {
  on_track: { cls: "bg-green-100 text-green-700", label: "On Track" },
  at_risk: { cls: "bg-amber-100 text-amber-700", label: "At Risk" },
  delayed: { cls: "bg-red-100 text-red-700", label: "Delayed" },
};

export function HealthBadge({ health }: { health: ProjectHealth }) {
  const h = healthStyles[health];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${h.cls}`}
    >
      {h.label}
    </span>
  );
}
