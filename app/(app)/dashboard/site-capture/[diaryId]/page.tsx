"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDiaryById, getDiaryPhotoUrls, getToolboxTalkById } from "@/lib/site-capture/client";
import { getProjects, getSites } from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteDiaryFull } from "@/lib/site-capture/types";
import type { Project, Site } from "@/lib/workspace/types";
import { WEATHER_CONDITION_ICONS, DIARY_STATUS_LABELS, DIARY_STATUS_BADGE, FORM_TYPE_CONFIG } from "@/lib/site-capture/types";
import type { FormType, PrestartChecklistFull, ToolboxTalkFull } from "@/lib/site-capture/types";
import DiaryEntryForm from "../components/DiaryEntryForm";
import PrestartChecklistForm from "../components/PrestartChecklistForm";
import InductionEntryForm from "../components/InductionEntryForm";
import IncidentReportForm from "../components/IncidentReportForm";
import ToolboxEntryForm from "../components/ToolboxEntryForm";
import { DiaryActions } from "../components/DiaryActions";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DiaryDetailPage() {
  const { diaryId } = useParams<{ diaryId: string }>();
  const { loading: wsLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

  const userRole = summary?.activeMembership?.role ?? null;
  const userId = summary?.userId ?? null;
  const companyId = summary?.activeMembership?.company_id ?? null;

  const [diary, setDiary] = useState<SiteDiaryFull | ToolboxTalkFull | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects and sites for context
  useEffect(() => {
    if (!companyId) return;
    Promise.all([getProjects(companyId), getSites(companyId)])
      .then(([projectsData, sitesData]) => {
        setProjects(projectsData);
        setSites(sitesData);
      })
      .catch((err) => {
        console.error("Failed to load projects/sites:", err);
      });
  }, [companyId]);

  useEffect(() => {
    if (!diaryId) return;
    setBusy(true);

    // First, try to get the diary to check its form_type
    getDiaryById(diaryId)
      .then(async (diaryData) => {
        if (!diaryData) {
          setError("Diary not found.");
          return;
        }

        // Check if this is a toolbox talk
        const formType = (diaryData as { form_type?: string }).form_type;
        
        let data: SiteDiaryFull | ToolboxTalkFull;
        
        if (formType === 'toolbox-talk') {
          // Load full toolbox talk data with attendees and actions
          const toolboxData = await getToolboxTalkById(diaryId);
          if (!toolboxData) {
            setError("Toolbox talk not found.");
            return;
          }
          data = toolboxData;
        } else {
          data = diaryData;
        }
        
        // Load diary content first so page renders immediately
        setDiary(data);
        
        // Fetch fresh 7-day signed URLs for photos via Edge Function (non-blocking)
        try {
          const photos = await getDiaryPhotoUrls(diaryId);
          setDiary((prev) => prev ? { ...prev, photos } : prev);
        } catch (photoErr) {
          console.warn("[DiaryDetailPage] Failed to load photo URLs:", photoErr);
          // Don't fail the whole page if photos can't load - they have fallback handling
        }
      })
      .catch((err) => {
        console.error("[DiaryDetailPage] Failed to load diary:", err);
        setError(err instanceof Error ? err.message : "Could not load diary.");
      })
      .finally(() => setBusy(false));
  }, [diaryId]);

  // Get project and site names for display
  const projectName = diary?.project_id 
    ? projects.find(p => p.id === diary.project_id)?.name || 'Unknown Project'
    : null;
  const siteName = diary?.site_id
    ? sites.find(s => s.id === diary.site_id)?.name || 'Unknown Site'
    : null;

  if (wsLoading || busy) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">⚠️</div>
        <p className="text-slate-600 text-center">{error ?? "Diary not found."}</p>
        <Link
          href="/dashboard/site-capture"
          className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 text-slate-900 font-semibold hover:bg-amber-500 transition-colors"
        >
          Back to diaries
        </Link>
      </div>
    );
  }

  const weatherIcon =
    diary.weather?.conditions ? WEATHER_CONDITION_ICONS[diary.weather.conditions] ?? "🌤️" : "🌤️";

  const statusLabel = DIARY_STATUS_LABELS[diary.status] ?? diary.status;
  const statusBadge = DIARY_STATUS_BADGE[diary.status] ?? "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 pb-24">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm pt-4 pb-3 -mx-4 px-4 border-b border-slate-200/80 mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/site-capture"
              className="flex-shrink-0 p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>{weatherIcon}</span>
                <h1 className="text-base font-bold text-slate-900 truncate">
                  {formatDate(diary.date)}
                </h1>
              </div>
              {/* Project and Site Context */}
              {(projectName || siteName) && (
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  {projectName && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {projectName}
                    </span>
                  )}
                  {projectName && siteName && (
                    <span className="text-slate-400">•</span>
                  )}
                  {siteName && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {siteName}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Status badge and Actions */}
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge}`}
              >
                {statusLabel}
              </span>
              <DiaryActions
                diary={diary}
                userRole={userRole}
                userId={userId}
                onUpdate={(updated) => setDiary(prev => prev ? { ...prev, ...updated } : prev)}
              />
            </div>
          </div>
        </div>

        {/* The entry form - conditional based on form_type */}
        {(() => {
          const formType = (diary as { form_type?: FormType }).form_type ?? 'daily-diary';
          
          if (formType === 'prestart-checklist') {
            // Convert diary data to prestart checklist format
            const prestartData: PrestartChecklistFull = {
              id: diary.id,
              companyId: diary.company_id,
              formType: 'prestart-checklist',
              status: diary.status,
              plantDetails: {
                equipmentType: '',
                makeModel: '',
                regoOrId: '',
                operatorName: '',
                date: diary.date,
                siteId: diary.site_id,
                projectId: diary.project_id,
              },
              checklistItems: [],
              defects: [],
              operatorDeclaration: null,
              supervisorSignOff: null,
              createdAt: diary.created_at,
              updatedAt: diary.updated_at,
              completedAt: diary.completed_at,
              completedBy: diary.completed_by,
              hasUnclearedCriticalDefects: false,
            };
            
            return (
              <PrestartChecklistForm
                checklist={prestartData}
                onUpdate={(updated) => {
                  // Map prestart updates back to diary format
                  setDiary(prev => prev ? {
                    ...prev,
                    status: updated.status,
                    completed_at: updated.completedAt,
                    completed_by: updated.completedBy,
                  } : prev);
                }}
                projects={projects}
                sites={sites}
                userRole={userRole}
                userId={userId}
              />
            );
          }
          
          if (formType === 'toolbox-talk') {
            return (
              <ToolboxEntryForm
                diary={diary as ToolboxTalkFull}
                onUpdate={(updated) => setDiary(updated)}
                userRole={userRole}
                userId={userId}
              />
            );
          }

          if (formType === 'site-induction') {
            return (
              <InductionEntryForm
                diary={diary}
                onUpdate={setDiary}
                userRole={userRole}
                userId={userId}
              />
            );
          }

          if (formType === 'incident-report') {
            return (
              <IncidentReportForm
                diary={diary}
                onUpdate={setDiary}
                userRole={userRole}
                userId={userId}
                projects={projects}
                sites={sites}
              />
            );
          }
          
          // Default: Daily Diary form
          return (
            <DiaryEntryForm
              diary={diary}
              onUpdate={setDiary}
              userRole={userRole}
              userId={userId}
            />
          );
        })()}
      </div>
    </div>
  );
}
