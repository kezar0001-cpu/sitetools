/**
 * Centralised React Query key factory for the SitePlan module.
 *
 * Keeping keys in one place prevents typo-driven cache misses and makes
 * bulk invalidation (e.g. invalidate everything for a project) easy.
 */

export const sitePlanKeys = {
  /** Root prefix — use to wipe all siteplan cache in tests / dev. */
  all: ["siteplan"] as const,

  // ── Auth / company ──────────────────────────────────────────
  companyId: () => ["siteplan", "company-id"] as const,

  // ── Projects ────────────────────────────────────────────────
  projects: () => ["siteplan", "projects"] as const,
  projectList: (companyId: string | undefined) =>
    ["siteplan", "projects", companyId] as const,
  project: (projectId: string) =>
    ["siteplan", "project", projectId] as const,

  // ── Tasks ───────────────────────────────────────────────────
  tasks: (projectId: string) =>
    ["siteplan", "tasks", projectId] as const,
  progressLog: (taskId: string) =>
    ["siteplan", "progress-log", taskId] as const,

  // ── Delay logs ──────────────────────────────────────────────
  delayLogs: (taskId: string) =>
    ["siteplan", "delay-logs", taskId] as const,
  projectDelayLogs: (projectId: string) =>
    ["siteplan", "delay-logs-project", projectId] as const,

  // ── Baselines ───────────────────────────────────────────────
  baselines: (projectId: string) =>
    ["siteplan", "baselines", projectId] as const,
} as const;

export const companyKeys = {
  members: (companyId: string | null) =>
    ["company-members", companyId] as const,
} as const;
