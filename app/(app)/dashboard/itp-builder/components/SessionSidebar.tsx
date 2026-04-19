"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { ITPSession, ProjectOption, SiteOption, ProjectGroup } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSessionStatus(s: ITPSession): string {
  if (s.status === "archived") return "archived";
  if (s.status === "complete") return "complete";
  return "active";
}

function groupSessions(
  sessions: ITPSession[],
  projects: ProjectOption[],
  sites: SiteOption[]
): ProjectGroup[] {
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const siteMap = new Map(sites.map((s) => [s.id, s.name]));

  const projectGroupsMap = new Map<string | null, Map<string | null, ITPSession[]>>();

  for (const session of sessions) {
    const pId = session.project_id ?? null;
    const sId = session.site_id ?? null;
    if (!projectGroupsMap.has(pId)) projectGroupsMap.set(pId, new Map());
    const siteGroupMap = projectGroupsMap.get(pId)!;
    if (!siteGroupMap.has(sId)) siteGroupMap.set(sId, []);
    siteGroupMap.get(sId)!.push(session);
  }

  const sortedProjectIds = Array.from(projectGroupsMap.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return (projectMap.get(a) ?? "").localeCompare(projectMap.get(b) ?? "");
  });

  return sortedProjectIds.map((pId) => {
    const siteGroupMap = projectGroupsMap.get(pId)!;
    const sortedSiteIds = Array.from(siteGroupMap.keys()).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return (siteMap.get(a) ?? "").localeCompare(siteMap.get(b) ?? "");
    });
    return {
      projectId: pId,
      projectName: pId ? (projectMap.get(pId) ?? "Unknown Project") : null,
      siteGroups: sortedSiteIds.map((sId) => ({
        siteId: sId,
        siteName: sId ? (siteMap.get(sId) ?? "Unknown Site") : null,
        sessions: siteGroupMap.get(sId)!,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Session Card
// ---------------------------------------------------------------------------

interface SessionCardProps {
  session: ITPSession;
  isActive: boolean;
  onSelect: (session: ITPSession) => void;
}

function SessionCard({ session, isActive, onSelect }: SessionCardProps) {
  const items = session.items ?? [];
  const total = items.length;
  const signed = items.filter((i) => i.status === "signed").length;
  const allSigned = total > 0 && signed === total;

  const statusLabel = allSigned ? "Complete" : total === 0 ? "Empty" : "In Progress";
  const statusColor = allSigned
    ? "bg-green-100 text-green-700"
    : total === 0
    ? "bg-slate-100 text-slate-500"
    : "bg-amber-100 text-amber-700";

  return (
    <button
      onClick={() => onSelect(session)}
      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
        isActive
          ? "bg-violet-50 border border-violet-200"
          : "hover:bg-slate-50 border border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? "text-violet-900" : "text-slate-800"}`}>
          {session.task_description}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{formatSessionDate(session.created_at)}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {total > 0 && (
          <span className="text-xs text-slate-400">{signed}/{total}</span>
        )}
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SessionSidebar
// ---------------------------------------------------------------------------

export interface SessionSidebarProps {
  sessions: ITPSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  loadingMore: boolean;
  totalSessionCount: number;
  searchQuery: string;
  statusFilter: string;
  sortOrder: string;
  showArchived: boolean;
  projects: ProjectOption[];
  allSites: SiteOption[];
  referenceDataError: string | null;
  activeSessionId: string | null;
  onSelectSession: (session: ITPSession) => void;
  onNewITP: () => void;
  onLoadMore: () => void;
  onRetryLoad: () => void;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (status: string) => void;
  onSortOrderChange: (sort: string) => void;
  onShowArchivedChange: (show: boolean) => void;
}

export default function SessionSidebar({
  sessions,
  sessionsLoading,
  sessionsError,
  loadingMore,
  totalSessionCount,
  searchQuery,
  statusFilter,
  sortOrder,
  showArchived,
  projects,
  allSites,
  referenceDataError,
  activeSessionId,
  onSelectSession,
  onNewITP,
  onLoadMore,
  onRetryLoad,
  onSearchChange,
  onStatusFilterChange,
  onSortOrderChange,
  onShowArchivedChange,
}: SessionSidebarProps) {
  // Filter and sort sessions
  const filteredSessions = sessions.filter((s) => {
    const status = getSessionStatus(s);
    if (status === "archived" && !showArchived) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!s.task_description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
  });

  const grouped = groupSessions(sortedSessions, projects, allSites);

  const archivedCount = sessions.filter((s) => getSessionStatus(s) === "archived").length;

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            ITPs{totalSessionCount > 0 && ` (${totalSessionCount})`}
          </h2>
          <button
            onClick={onNewITP}
            className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-xl px-3 py-1.5 text-xs active:scale-95 transition-transform"
          >
            + New
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 outline-none text-sm bg-white transition-colors"
        />

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {(["all", "active", "complete", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                onStatusFilterChange(s);
                if (s === "archived") onShowArchivedChange(true);
              }}
              className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {s === "all" ? "All" : s === "active" ? "Active" : s === "complete" ? "Complete" : "Archived"}
            </button>
          ))}
          <button
            onClick={() => onSortOrderChange(sortOrder === "newest" ? "oldest" : "newest")}
            className="ml-auto text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {sortOrder === "newest" ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>
      </div>

      {/* Session list — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {sessionsLoading && !sessionsError ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sessionsError ? (
          <div className="text-center py-8 px-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">Failed to load ITPs</p>
            <p className="text-xs text-slate-400 mb-3">{sessionsError}</p>
            <button
              onClick={onRetryLoad}
              disabled={sessionsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${sessionsLoading ? "animate-spin" : ""}`} />
              {sessionsLoading ? "Retrying…" : "Try again"}
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            {sessions.length > 0 ? "No ITPs match your filters." : "No ITPs yet."}
          </div>
        ) : (
          grouped.map((pg) => (
            <div key={pg.projectId ?? "__none__"} className="space-y-0.5">
              {/* Project header */}
              <div className="flex items-center gap-1.5 px-1 pt-2 pb-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-slate-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                  />
                </svg>
                <span className="text-xs font-bold text-slate-500 truncate">
                  {pg.projectName ?? "No Project"}
                </span>
              </div>

              {pg.siteGroups.map((sg) => (
                <div key={sg.siteId ?? "__none__"} className="pl-3 space-y-0.5">
                  {(sg.siteName || pg.siteGroups.length > 1) && (
                    <div className="flex items-center gap-1 px-1 pb-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-2.5 w-2.5 text-slate-300 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[11px] font-semibold text-slate-400 truncate">
                        {sg.siteName ?? "No Site"}
                      </span>
                    </div>
                  )}
                  {sg.sessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onSelect={onSelectSession}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))
        )}

        {/* Show/hide archived */}
        {!showArchived && archivedCount > 0 && statusFilter !== "archived" && (
          <button
            onClick={() => onShowArchivedChange(true)}
            className="w-full text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl py-2 hover:text-slate-600 hover:border-slate-300 transition-colors mt-1"
          >
            Show archived ({archivedCount})
          </button>
        )}
        {showArchived && statusFilter !== "archived" && archivedCount > 0 && (
          <button
            onClick={() => onShowArchivedChange(false)}
            className="w-full text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl py-2 hover:text-slate-600 hover:border-slate-300 transition-colors mt-1"
          >
            Hide archived
          </button>
        )}

        {/* Load more */}
        {sessions.length < totalSessionCount && !sessionsLoading && (
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full text-center text-xs font-semibold text-slate-500 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 disabled:opacity-50 transition-colors mt-2"
          >
            {loadingMore ? "Loading…" : `Load more (${sessions.length} of ${totalSessionCount})`}
          </button>
        )}
      </div>
    </div>
  );
}
