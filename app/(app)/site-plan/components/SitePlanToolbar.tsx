"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  GitBranch,
  MoreHorizontal,
  Network,
  PenLine,
  Target,
  Upload,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  iconOnly,
  activeClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  iconOnly?: boolean;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
        iconOnly ? "w-8 px-0" : "gap-1.5 px-2"
      } ${
        active
          ? (activeClassName ?? "border-blue-300 bg-blue-50 text-blue-700")
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-4 w-4" />
      {!iconOnly ? <span className="hidden md:inline">{label}</span> : null}
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
  const isNarrow = useMediaQuery("(max-width: 1199px)");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  useEffect(() => {
    if (!editingName) setDraftName(projectName);
  }, [projectName, editingName]);

  useEffect(() => {
    if (!isNarrow) setIsOverflowOpen(false);
  }, [isNarrow]);

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

  const zoomOptions: ZoomLevel[] = ["day", "week", "month", "quarter"];

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/projects"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
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

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onToday}
            className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Today
          </button>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <div className="relative">
            <select
              value={zoom}
              onChange={(event) => setZoom(event.target.value as ZoomLevel)}
              className="inline-flex h-8 appearance-none rounded-md border border-slate-200 bg-white py-0 pl-2 pr-7 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50"
              title="Zoom level"
            >
              {zoomOptions.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>

          <ToolbarButton
            icon={Network}
            label="Dependencies"
            onClick={() => setShowDeps(!showDeps)}
            active={showDeps}
            title="Show Dependencies"
            iconOnly
          />
          <ToolbarButton
            icon={GitBranch}
            label="Critical Path"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            active={showCriticalPath}
            activeClassName="border-red-300 bg-red-50 text-red-700"
            title="Critical Path"
            iconOnly
          />

          <div className="mx-1 h-5 w-px bg-slate-200" />

          {isNarrow ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOverflowOpen((current) => !current)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-slate-600 transition-colors hover:bg-slate-50"
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isOverflowOpen ? (
                <div className="absolute right-0 top-10 z-30 min-w-[120px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImport();
                      setIsOverflowOpen(false);
                    }}
                    className="flex h-8 w-full items-center gap-1.5 rounded px-2 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBaseline();
                      setIsOverflowOpen(false);
                    }}
                    className="flex h-8 w-full items-center gap-1.5 rounded px-2 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <Target className="h-4 w-4" />
                    Baseline
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <ToolbarButton icon={Upload} label="Import" onClick={onOpenImport} />
              <ToolbarButton icon={Target} label="Baseline" onClick={onOpenBaseline} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
