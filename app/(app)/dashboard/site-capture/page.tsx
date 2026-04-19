"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { getDiaries, createDiary } from "@/lib/site-capture/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteDiaryWithCounts, FormType } from "@/lib/site-capture/types";
import { FORM_TYPE_CONFIG } from "@/lib/site-capture/types";
import { ModuleLoadingState } from "@/components/loading/ModuleLoadingState";
import DiaryListCard from "./components/DiaryListCard";
import { FormTypeGrid } from "./components/FormTypeGrid";
import { FilterTabs } from "./components/FilterTabs";
import { NewDiaryModal } from "./components/NewDiaryModal";
import { DiaryFilters } from "./components/DiaryFilters";
import { TodayDiaryCard } from "./components/TodayDiaryCard";

type FilterTab = "all" | FormType;

export default function SiteCaptureHubPage() {
  const router = useRouter();
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

  const companyId = summary?.activeMembership?.company_id ?? null;

  const [diaries, setDiaries] = useState<SiteDiaryWithCounts[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<FormType>("daily-diary");
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

  // Calculate counts for filter tabs (only creatable form types shown)
  const tabCounts = useMemo(() => {
    const counts: Record<"all" | "daily-diary" | "prestart-checklist", number> = { 
      all: 0, 
      "daily-diary": 0, 
      "prestart-checklist": 0 
    };
    
    for (const diary of diaries) {
      if (!showArchived && diary.status === 'archived') continue;
      
      const formType = (diary as { form_type?: FormType }).form_type ?? 'daily-diary';
      counts.all++;
      if (formType === 'daily-diary' || formType === 'prestart-checklist') {
        counts[formType]++;
      }
    }
    
    return counts;
  }, [diaries, showArchived]);

  const loadDiaries = useCallback(async (projectId?: string | null, siteId?: string | null) => {
    if (!companyId) return;
    setBusy(true);
    try {
      const flat = await getDiaries(companyId, projectId);
      const filteredFlat = siteId ? flat.filter((diary) => diary.site_id === siteId) : flat;
      setDiaries(filteredFlat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load diaries.");
    } finally {
      setBusy(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    loadDiaries(filterProjectId, filterSiteId);
  }, [companyId, loadDiaries, filterProjectId, filterSiteId]);

  function handleNewEntry(formType: FormType) {
    setSelectedFormType(formType);
    setShowModal(true);
  }

  async function handleCreateDiary(projectId: string | null, siteId: string | null) {
    if (!companyId) return;
    setCreating(true);
    setError(null);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
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
    } finally {
      setCreating(false);
    }
  }

  const handleFilterChange = (projectId: string | null, siteId: string | null, archived: boolean) => {
    setFilterProjectId(projectId);
    setFilterSiteId(siteId);
    setShowArchived(archived);
  };

  if (wsLoading) {
    return <ModuleLoadingState variant="spinner" size="lg" fullPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SiteCapture</h1>
          <p className="text-sm text-slate-500 mt-0.5">Field records that complement SiteSign — daily diaries and prestart checklists.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Today's Diary - Primary Quick Action */}
        <TodayDiaryCard 
          diaries={diaries} 
          onOpenDiary={(id: string) => router.push(`/dashboard/site-capture/${id}`)}
          onCreateDiary={() => handleNewEntry('daily-diary')}
          loading={busy}
        />

        {/* Create New */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Create New</h2>
          <FormTypeGrid onNewEntry={handleNewEntry} />
        </section>

        {/* Recent Entries Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent Entries</h2>
            <span className="text-xs text-slate-400">{filteredDiaries.length} total</span>
          </div>

          {/* Filter Tabs */}
          <FilterTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            counts={tabCounts}
          />

          {/* Compact Filters */}
          <DiaryFilters
            companyId={companyId ?? ""}
            onFilterChange={handleFilterChange}
            disabled={busy}
            showArchived={showArchived}
          />

          {/* Entries List */}
          {busy ? (
            <ModuleLoadingState variant="pulse" count={3} />
          ) : filteredDiaries.length === 0 ? (
            <EmptyState
              icon="📋"
              title={showArchived ? "No archived entries." : "No entries yet."}
              description={showArchived 
                ? "No archived entries match your filters." 
                : activeTab !== 'all' 
                  ? `No ${FORM_TYPE_CONFIG[activeTab as FormType]?.label ?? 'entries'} found. Create one above.`
                  : "Daily diaries and prestart checklists appear here. Create your first record above."
              }
              className="py-12 bg-white rounded-2xl border border-slate-200"
            />
          ) : (
            <div className="space-y-3">
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
