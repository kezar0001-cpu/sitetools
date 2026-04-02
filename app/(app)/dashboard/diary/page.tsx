"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { getDiaries, createDiary, getDiariesGroupedByProjectSite } from "@/lib/diary/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteDiaryWithCounts } from "@/lib/diary/types";
import DiaryListCard from "./components/DiaryListCard";
import { NewDiaryModal } from "./components/NewDiaryModal";
import { DiaryProjectSiteView } from "./components/DiaryProjectSiteView";
import { DiaryFilters } from "./components/DiaryFilters";

export default function DiaryListPage() {
  const router = useRouter();
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

  const companyId = summary?.activeMembership?.company_id ?? null;

  const [diaries, setDiaries] = useState<SiteDiaryWithCounts[]>([]);
  const [groupedDiaries, setGroupedDiaries] = useState<Awaited<ReturnType<typeof getDiariesGroupedByProjectSite>> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterSiteId, setFilterSiteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Filter diaries based on archived status
  const filteredDiaries = showArchived 
    ? diaries 
    : diaries.filter(d => d.status !== 'archived');

  const loadDiaries = async (projectId?: string | null, siteId?: string | null, includeArchived?: boolean) => {
    if (!companyId) return;
    setBusy(true);
    try {
      if (viewMode === 'grouped') {
        const grouped = await getDiariesGroupedByProjectSite(companyId, projectId);
        setGroupedDiaries(grouped);
        // Also set flat diaries for today's diary check
        const flat = await getDiaries(companyId, projectId);
        setDiaries(flat);
      } else {
        const flat = await getDiaries(companyId, projectId);
        setDiaries(flat);
        setGroupedDiaries(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load diaries.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadDiaries(filterProjectId, filterSiteId, showArchived);
  }, [companyId, viewMode, filterProjectId, filterSiteId, showArchived]);

  // Check if today's diary already exists
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayDiary = diaries.find((d) => d.date === todayIso);

  async function handleStartToday() {
    if (!companyId) return;
    if (todayDiary) {
      router.push(`/dashboard/diary/${todayDiary.id}`);
      return;
    }
    setShowModal(true);
  }

  async function handleCreateDiary(projectId: string | null, siteId: string | null) {
    if (!companyId) return;
    setCreating(true);
    setError(null);
    try {
      const diary = await createDiary({ 
        company_id: companyId, 
        project_id: projectId, 
        site_id: siteId, 
        date: todayIso 
      });
      setShowModal(false);
      router.push(`/dashboard/diary/${diary.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create diary.");
      setCreating(false);
    }
  }

  const handleFilterChange = (projectId: string | null, siteId: string | null, archived: boolean) => {
    setFilterProjectId(projectId);
    setFilterSiteId(siteId);
    setShowArchived(archived);
  };

  if (wsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Site Diary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daily site records — weather, labour, plant & photos.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Start Today CTA */}
        <button
          type="button"
          onClick={handleStartToday}
          disabled={creating || busy}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-amber-400 text-slate-900 text-base font-bold shadow-lg hover:bg-amber-500 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {creating ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : todayDiary ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          {todayDiary ? "Continue Today's Diary" : "Start Today's Diary"}
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-1">
          <button
            onClick={() => setViewMode('grouped')}
            disabled={busy}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grouped' 
                ? 'bg-amber-400 text-slate-900' 
                : 'text-slate-600 hover:text-slate-900'
            } disabled:opacity-50`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Project & Site
            </span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            disabled={busy}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list' 
                ? 'bg-amber-400 text-slate-900' 
                : 'text-slate-600 hover:text-slate-900'
            } disabled:opacity-50`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Simple List
            </span>
          </button>
        </div>

        {/* Filters */}
        <DiaryFilters
          companyId={companyId ?? ""}
          onFilterChange={handleFilterChange}
          disabled={busy}
          showArchived={showArchived}
        />

        {/* Diary list */}
        {busy ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'grouped' && groupedDiaries ? (
          <DiaryProjectSiteView 
            groupedDiaries={groupedDiaries} 
            showArchived={showArchived}
          />
        ) : filteredDiaries.length === 0 ? (
          <EmptyState
            icon="📋"
            title={showArchived ? "No archived diaries." : "No diaries yet."}
            description={showArchived ? "No archived diaries match your filters." : "Tap 'Start Today's Diary' above to log your first entry."}
            className="py-16"
          />
        ) : (
          <div className="space-y-3">
            {filteredDiaries.length > 0 && (
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
                {showArchived ? 'Archived entries' : 'Recent entries'}
              </p>
            )}
            {filteredDiaries.map((diary) => (
              <DiaryListCard key={diary.id} diary={diary} />
            ))}
          </div>
        )}

        {/* New Diary Modal */}
        <NewDiaryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateDiary}
          companyId={companyId ?? ""}
          isCreating={creating}
        />
      </div>
    </div>
  );
}
