"use client";

import { useState } from "react";
import type { SiteDiaryWithCounts } from "@/lib/diary/types";
import DiaryListCard from "./DiaryListCard";

interface DiaryProjectSiteViewProps {
  groupedDiaries: {
    projects: Array<{
      id: string;
      name: string;
      sites: Array<{
        id: string;
        name: string;
        diaries: SiteDiaryWithCounts[];
      }>;
      unassignedDiaries: SiteDiaryWithCounts[];
    }>;
    unassignedDiaries: SiteDiaryWithCounts[];
  };
  showArchived?: boolean;
}

export function DiaryProjectSiteView({ groupedDiaries, showArchived = false }: DiaryProjectSiteViewProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  // Filter function for diaries
  const shouldShowDiary = (diary: SiteDiaryWithCounts) => {
    return showArchived || diary.status !== 'archived';
  };

  // Filter diaries in a list
  const filterDiaries = (diaries: SiteDiaryWithCounts[]) => {
    return showArchived ? diaries : diaries.filter(d => d.status !== 'archived');
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleSite = (siteId: string) => {
    setExpandedSites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(siteId)) {
        newSet.delete(siteId);
      } else {
        newSet.add(siteId);
      }
      return newSet;
    });
  };

  // Calculate total visible diary count
  const totalDiaryCount = 
    filterDiaries(groupedDiaries.unassignedDiaries).length +
    groupedDiaries.projects.reduce((acc, project) => 
      acc + filterDiaries(project.unassignedDiaries).length + 
      project.sites.reduce((siteAcc, site) => siteAcc + filterDiaries(site.diaries).length, 0), 0
    );

  if (totalDiaryCount === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-slate-600">
          {showArchived ? "No archived diaries found." : "No diaries found for the selected filters."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unassigned Diaries (not linked to any project) */}
      {filterDiaries(groupedDiaries.unassignedDiaries).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleProject('unassigned')}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg 
                className={`w-4 h-4 transition-transform ${expandedProjects.has('unassigned') ? 'rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-slate-900">Unassigned Diaries</span>
              <span className="text-sm text-slate-500">({filterDiaries(groupedDiaries.unassignedDiaries).length})</span>
            </div>
          </button>
          
          {expandedProjects.has('unassigned') && (
            <div className="border-t border-slate-200">
              {filterDiaries(groupedDiaries.unassignedDiaries).map((diary) => (
                <div key={diary.id} className="border-b border-slate-100 last:border-b-0">
                  <DiaryListCard diary={diary} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects with their sites */}
      {groupedDiaries.projects.map((project) => (
        <div key={project.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleProject(project.id)}
            className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg 
                className={`w-4 h-4 transition-transform ${expandedProjects.has(project.id) ? 'rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-slate-900">{project.name}</span>
              <span className="text-sm text-slate-500">
                ({filterDiaries(project.unassignedDiaries).length + project.sites.reduce((acc, site) => acc + filterDiaries(site.diaries).length, 0)} diaries)
              </span>
            </div>
          </button>

          {expandedProjects.has(project.id) && (
            <div className="border-t border-slate-200">
              {/* Project-level unassigned diaries */}
              {filterDiaries(project.unassignedDiaries).length > 0 && (
                <div className="border-b border-slate-100">
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                    <span className="text-sm font-medium text-amber-800">
                      Project Diaries ({filterDiaries(project.unassignedDiaries).length})
                    </span>
                  </div>
                  {filterDiaries(project.unassignedDiaries).map((diary) => (
                    <div key={diary.id} className="border-b border-slate-100 last:border-b-0">
                      <DiaryListCard diary={diary} />
                    </div>
                  ))}
                </div>
              )}

              {/* Sites within the project */}
              {project.sites.map((site) => (
                <div key={site.id} className="border-b border-slate-100 last:border-b-0">
                  <button
                    onClick={() => toggleSite(site.id)}
                    className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg 
                        className={`w-3 h-3 transition-transform ${expandedSites.has(site.id) ? 'rotate-90' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">{site.name}</span>
                      <span className="text-xs text-slate-500">({filterDiaries(site.diaries).length})</span>
                    </div>
                  </button>

                  {expandedSites.has(site.id) && (
                    <div className="border-t border-slate-100">
                      {filterDiaries(site.diaries).map((diary) => (
                        <div key={diary.id} className="border-b border-slate-100 last:border-b-0">
                          <DiaryListCard diary={diary} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
