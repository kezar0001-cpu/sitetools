"use client";

import { useEffect, useState, useMemo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { getDiaries, createDiary, getDiariesGroupedByProjectSite } from "@/lib/site-capture/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteDiaryWithCounts, FormType } from "@/lib/site-capture/types";
import { FORM_TYPE_CONFIG } from "@/lib/site-capture/types";
import DiaryListCard from "./components/DiaryListCard";
import { FormTypeGrid } from "./components/FormTypeGrid";
import { FilterTabs } from "./components/FilterTabs";
import { NewDiaryModal } from "./components/NewDiaryModal";
import { DiaryProjectSiteView } from "./components/DiaryProjectSiteView";
import { DiaryFilters } from "./components/DiaryFilters";

type FilterTab = "all" | FormType;

export default function SiteCaptureHubPage() {
  const router = useRouter();
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

  const companyId = summary?.activeMembership?.company_id ?? null;

  const [diaries, setDiaries] = useState<SiteDiaryWithCounts[]>([]);
  const [groupedDiaries, setGroupedDiaries] = useState<Awaited<ReturnType<typeof getDiariesGroupedByProjectSite>> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<FormType>("daily-diary");
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterSiteId, setFilterSiteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Filter diaries based on archived status AND form type tab
  const filteredDiaries = useMemo(() => {
    let result = diaries;
    
    // Filter by archived status
    if (!showArchived) {
      result = result.filter(d => d.status !== 'archived');
    }
    
    // Filter by form type tab
    if (activeTab !== 'all') {
      result = result.filter(d => ((d as { form_type?: FormType }).form_type ?? 'daily-diary') === activeTab);
    }
    
    return result;
  }, [diaries, showArchived, activeTab]);

  // Calculate counts for filter tabs
  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: 0, "daily-diary": 0, "prestart-checklist": 0, "site-induction": 0, "toolbox-talk": 0, "incident-report": 0, "site-inspection": 0 };
    
    for (const diary of diaries) {
      if (!showArchived && diary.status === 'archived') continue;
      
      const formType = (diary as { form_type?: FormType }).form_type ?? 'daily-diary';
      counts.all++;
      if (formType in counts) {
        counts[formType as FilterTab]++;
      }
    }
    
    return counts;
  }, [diaries, showArchived]);

  const loadDiaries = async (projectId?: string | null) => {
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
    if (!companyId) return;
    setBusy(true);
    loadDiaries(filterProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, viewMode, filterProjectId, filterSiteId, showArchived]);

  function handleNewEntry(formType: FormType) {
    setSelectedFormType(formType);
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
        date: todayIso,
        form_type: selectedFormType,
      });
      setShowModal(false);
      router.push(`/dashboard/site-capture/${diary.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create entry.");
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
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SiteCapture</h1>
          <p className="text-sm text-slate-500 mt-0.5">All your site forms in one place — diaries, checklists, inspections, and reports.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form Type Grid */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Start New Entry</h2>
          <FormTypeGrid onNewEntry={handleNewEntry} />
        </section>

        {/* Recent Entries Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent Entries</h2>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1">
              <button
                onClick={() => setViewMode('grouped')}
                disabled={busy}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-amber-400 text-slate-900' 
                    : 'text-slate-600 hover:text-slate-900'
                } disabled:opacity-50`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                By Project
              </button>
              <button
                onClick={() => setViewMode('list')}
                disabled={busy}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-amber-400 text-slate-900' 
                    : 'text-slate-600 hover:text-slate-900'
                } disabled:opacity-50`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                List
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <FilterTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            counts={tabCounts}
          />

          {/* Project/Site Filters */}
          <DiaryFilters
            companyId={companyId ?? ""}
            onFilterChange={handleFilterChange}
            disabled={busy}
            showArchived={showArchived}
          />

          {/* Entries List */}
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
              title={showArchived ? "No archived entries." : "No entries yet."}
              description={showArchived 
                ? "No archived entries match your filters." 
                : activeTab !== 'all' 
                  ? `No ${FORM_TYPE_CONFIG[activeTab as FormType]?.label ?? 'entries'} found. Select a form type above to create one.`
                  : "Select a form type above to create your first entry."
              }
              className="py-12 bg-white rounded-2xl border border-slate-200"
            />
          ) : (
            <div className="space-y-3">
              {filteredDiaries.length > 0 && (
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
                  {showArchived ? 'Archived entries' : `${filteredDiaries.length} entries`}
                </p>
              )}
              {filteredDiaries.map((diary) => (
                <DiaryListCard key={diary.id} diary={diary} />
              ))}
            </div>
          )}
        </section>

        {/* New Entry Modal */}
        <NewDiaryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateDiary}
          companyId={companyId ?? ""}
          isCreating={creating}
          formTypeLabel={FORM_TYPE_CONFIG[selectedFormType]?.label}
        />
      </div>
    </div>
  );
}
