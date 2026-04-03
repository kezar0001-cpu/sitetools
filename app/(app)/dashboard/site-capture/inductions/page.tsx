"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { getDiaries } from "@/lib/site-capture/client";
import type { SiteDiaryWithCounts, FormType } from "@/lib/site-capture/types";
import { DIARY_STATUS_BADGE } from "@/lib/site-capture/types";

interface InductionEntry extends SiteDiaryWithCounts {
  induction_data?: SiteInductionData;
  form_type?: FormType;
}

interface ProjectGroup {
  id: string;
  name: string;
  entries: InductionEntry[];
}

export default function InductionRegisterPage() {
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const companyId = summary?.activeMembership?.company_id ?? null;

  const [entries, setEntries] = useState<InductionEntry[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  const inductionEntries = useMemo(() => {
    return entries.filter((e) => e.form_type === "site-induction");
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (showCompletedOnly) {
      return inductionEntries.filter((e) => e.status === "completed");
    }
    return inductionEntries;
  }, [inductionEntries, showCompletedOnly]);

  const groupedByProject = useMemo(() => {
    const groups = new Map<string, ProjectGroup>();

    for (const entry of filteredEntries) {
      const projectId = entry.project_id || "unassigned";
      const projectName = entry.project_id ? entry.project_id : "Unassigned";

      if (!groups.has(projectId)) {
        groups.set(projectId, {
          id: projectId,
          name: projectName,
          entries: [],
        });
      }
      groups.get(projectId)!.entries.push(entry);
    }

    // Sort entries within each group by date (newest first)
    groups.forEach((group) => {
      group.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.id === "unassigned") return 1;
      if (b.id === "unassigned") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredEntries]);

  useEffect(() => {
    if (!companyId) return;

    async function loadData() {
      setBusy(true);
      setError(null);
      try {
        const diaries = await getDiaries(companyId);
        // Cast to include induction_data
        setEntries(diaries as InductionEntry[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inductions");
      } finally {
        setBusy(false);
      }
    }

    loadData();
  }, [companyId]);

  if (wsLoading || busy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href="/dashboard/site-capture" className="hover:text-violet-600 transition-colors">
                SiteCapture
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-medium">Induction Register</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Site Induction Register</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              View and manage all worker site inductions by project
            </p>
          </div>
          <Link
            href="/dashboard/site-capture"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-100 text-violet-700 font-medium hover:bg-violet-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Induction
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Total Inductions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{inductionEntries.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {inductionEntries.filter((e) => e.status === "completed").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Draft / In Progress</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {inductionEntries.filter((e) => e.status === "draft").length}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompletedOnly}
              onChange={(e) => setShowCompletedOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-slate-700">Show completed only</span>
          </label>
        </div>

        {/* Induction List */}
        {filteredEntries.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No inductions found"
            description={
              showCompletedOnly
                ? "No completed inductions yet. Complete an induction to see it here."
                : "Get started by creating your first site induction from the SiteCapture hub."
            }
            className="py-16 bg-white rounded-2xl border border-slate-200"
          />
        ) : (
          <div className="space-y-8">
            {groupedByProject.map((project) => (
              <section key={project.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-slate-700">
                    {project.id === "unassigned" ? "Unassigned" : project.name}
                  </h2>
                  <span className="text-xs text-slate-400">({project.entries.length} inductions)</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Worker</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Company</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Trade</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {project.entries.map((entry) => {
                        const inductionData = entry.induction_data;
                        const workerName = inductionData?.workerDetails?.fullName || "Unknown";
                        const company = inductionData?.workerDetails?.company || "-";
                        const trade = inductionData?.workerDetails?.trade || "-";
                        const statusClass = DIARY_STATUS_BADGE[entry.status] || "bg-slate-100 text-slate-600";

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {inductionData?.workerDetails?.photoIdUrl ? (
                                  <img
                                    src={inductionData.workerDetails.photoIdUrl}
                                    alt={workerName}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-medium text-xs">
                                    {workerName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium text-slate-900">{workerName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{company}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                                {trade}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(entry.date).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass}`}>
                                {entry.status === "completed" ? "Complete" : entry.status === "draft" ? "Draft" : entry.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/dashboard/site-capture/${entry.id}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                              >
                                View
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
