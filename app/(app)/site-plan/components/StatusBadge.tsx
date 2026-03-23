"use client";

import type { TaskStatus, ProjectHealth } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import { STATUS_BADGE_STYLES, HEALTH_BADGE_STYLES } from "@/lib/sitePlanColors";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function HealthBadge({ health }: { health: ProjectHealth }) {
  const h = HEALTH_BADGE_STYLES[health];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${h.cls}`}
    >
      {h.label}
    </span>
  );
}
