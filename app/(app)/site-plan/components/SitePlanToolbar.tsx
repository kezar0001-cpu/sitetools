"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  CalendarRange,
  ChevronRight,
  GitBranch,
  Network,
  PenLine,
  Share2,
  Target,
  Upload,
} from "lucide-react";
import type { TaskStatus, TaskType } from "@/types/siteplan";

export interface TaskFilter {
  status: TaskStatus[];
  type: TaskType[];
  assignedTo: string;
  search: string;
}

export const EMPTY_FILTER: TaskFilter = {
  status: [],
  type: [],
  assignedTo: "",
  search: "",
};

export function isFilterActive(f: TaskFilter): boolean {
  return f.status.length > 0 || f.type.length > 0 || f.assignedTo !== "" || f.search !== "";
}

type ZoomLevel = "day" | "week" | "month" | "quarter";
type ViewTab = "grid" | "gantt" | "card";

interface SitePlanToolbarProps {
  projectName: string;
  onProjectNameSave: (name: string) => void | Promise<void>;
  zoom: ZoomLevel;
  setZoom: (zoom: ZoomLevel) => void;
  showDeps: boolean;
  setShowDeps: (show: boolean) => void;
  showCriticalPath: boolean;
  setShowCriticalPath: (show: boolean) => void;
  onOpenBaseline: () => void;
  onOpenImport: () => void;
  onToday: () => void;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 inline-flex items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export function SitePlanToolbar({
  projectName,
  onProjectNameSave,
  zoom,
  setZoom,
  showDeps,
  setShowDeps,
  showCriticalPath,
  setShowCriticalPath,
  onOpenBaseline,
  onOpenImport,
  onToday,
}: SitePlanToolbarProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName);

  useEffect(() => {
    if (!editingName) setDraftName(projectName);
  }, [projectName, editingName]);

  const finishEdit = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== projectName) {
      void onProjectNameSave(trimmed);
    }
    setEditingName(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") finishEdit();
    if (event.key === "Escape") {
      setDraftName(projectName);
      setEditingName(false);
    }
  };

  const tabs: Array<{ key: ViewTab; label: string; enabled: boolean }> = [
    { key: "grid", label: "Grid View", enabled: false },
    { key: "gantt", label: "Gantt View", enabled: true },
    { key: "card", label: "Card View", enabled: false },
  ];

  const zoomOptions: ZoomLevel[] = ["day", "week", "month", "quarter"];

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Projects
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          {editingName ? (
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={finishEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-8 w-52 rounded-md border border-slate-300 px-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              title="Edit project name"
            >
              <span className="max-w-[220px] truncate">{projectName || "Untitled Project"}</span>
              <PenLine className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {tabs.map((tab) => {
            const isActive = tab.key === "gantt";
            return (
              <button
                key={tab.key}
                type="button"
                disabled={!tab.enabled}
                title={tab.enabled ? tab.label : "Coming soon"}
                className={`h-8 rounded px-3 text-xs font-medium ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
            {zoomOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setZoom(option)}
                className={`h-8 rounded px-2 text-xs font-medium capitalize ${
                  zoom === option ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <ToolbarButton
            icon={Network}
            label="Dependencies"
            onClick={() => setShowDeps(!showDeps)}
            active={showDeps}
          />
          <ToolbarButton
            icon={GitBranch}
            label="Critical Path"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            active={showCriticalPath}
          />

          <div className="mx-1 h-5 w-px bg-slate-200" />

          <ToolbarButton icon={Target} label="Baseline" onClick={onOpenBaseline} />
          <ToolbarButton icon={Upload} label="Import" onClick={onOpenImport} />
          <ToolbarButton icon={Share2} label="Share" onClick={() => undefined} />
          <ToolbarButton icon={CalendarRange} label="Today" onClick={onToday} />
        </div>
      </div>
    </div>
  );
}
