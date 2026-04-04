"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, GripVertical, AlertTriangle, Pencil, Plus } from "lucide-react";
import type { SitePlanTaskNode, TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS, computeWorkProgress } from "@/types/siteplan";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { ProgressBar } from "./ProgressSlider";
import {
  DEPTH_ZERO_ACCENT_BORDER,
  DEPTH_ZERO_DOT_COLORS,
  STATUS_DOT_STYLES,
  STATUS_TASK_BADGE_STYLES,
} from "@/lib/sitePlanColors";

export const COLUMN_DEFS: { id: string; label: string }[] = [
  { id: "dur", label: "Duration" },
  { id: "start", label: "Start" },
  { id: "finish", label: "Finish" },
  { id: "pred", label: "Predecessors" },
  { id: "pct", label: "% Complete" },
  { id: "status", label: "Status" },
  { id: "delays", label: "Delays" },
  { id: "assigned", label: "Assigned" },
];

interface TaskRowProps {
  node: SitePlanTaskNode;
  rowNumber: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (task: SitePlanTaskNode) => void;
  onLogDelay?: (task: SitePlanTaskNode) => void;
  delayCount?: number;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  isDragging?: boolean;
  depth: number;
  rootIndex: number;
  editMode?: boolean;
  isChecked?: boolean;
  onCheck?: (task: SitePlanTaskNode, checked: boolean) => void;
  hiddenColumns?: Set<string>;
  isHighlighted?: boolean;
  onAddBelow?: (node: SitePlanTaskNode) => void;
  onAddSubtask?: (node: SitePlanTaskNode) => void;
  isSelected?: boolean;
  selectedRowIds?: Set<string>;
  onRowNumberClick?: (node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateTask?: (taskId: string, updates: Partial<SitePlanTaskNode>) => void;
  columnWidths?: Record<string, number>;
  onHoverStart?: (taskId: string) => void;
  onHoverEnd?: () => void;
  isLastVisibleRow?: boolean;
  onEnterAddBelow?: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

function collectLeaves(nodes: SitePlanTaskNode[]): SitePlanTaskNode[] {
  const leaves: SitePlanTaskNode[] = [];
  const walk = (ns: SitePlanTaskNode[]) => {
    for (const n of ns) {
      if (n.children.length === 0) leaves.push(n);
      else walk(n.children);
    }
  };
  walk(nodes);
  return leaves;
}

function computeSummaryStats(children: SitePlanTaskNode[]) {
  if (children.length === 0) return null;
  const leaves = collectLeaves(children);
  const sources = leaves.length > 0 ? leaves : children;
  const parentIds = new Set(sources.filter((n) => n.children.length > 0).map((n) => n.id));
  const progress = computeWorkProgress(sources, parentIds);
  const startDate = sources.reduce((min, c) => (c.start_date < min ? c.start_date : min), sources[0].start_date);
  const endDate = sources.reduce((max, c) => (c.end_date > max ? c.end_date : max), sources[0].end_date);
  const status: TaskStatus = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started";
  return { progress, startDate, endDate, status };
}

export function TaskRow({
  node, rowNumber, expanded, onToggle, onSelect, onLogDelay, delayCount = 0,
  dragHandleProps, isDragging, depth, rootIndex, editMode = false, isChecked = false,
  onCheck, hiddenColumns = new Set(), isHighlighted = false, onAddBelow, onAddSubtask,
  isSelected = false, selectedRowIds = new Set(), onRowNumberClick, onUpdateTask,
  columnWidths, onHoverStart, onHoverEnd,
}: TaskRowProps) {
  const isSummary = node.children.length > 0;
  const isMilestone = node.type === "milestone";
  const isRoot = depth === 0;
  const isRowSelected = isSelected || selectedRowIds.has(node.id);

  const summaryStats = isSummary ? computeSummaryStats(node.children) : null;
  const displayProgress = summaryStats?.progress ?? node.progress;
  const displayStartDate = summaryStats?.startDate ?? node.start_date;
  const displayEndDate = summaryStats?.endDate ?? node.end_date;
  const displayStatus = summaryStats?.status ?? node.status;

  const bg = isDragging ? "bg-blue-50" : isHighlighted ? "bg-yellow-50" : isRowSelected ? "bg-blue-50" : isRoot && isSummary ? "bg-slate-50" : "bg-white";
  const accentBorder = isRoot
    ? `border-l-[3px] ${DEPTH_ZERO_ACCENT_BORDER[rootIndex % 6]}`
    : depth === 1 && isSummary
      ? "border-l-2 border-l-slate-300"
      : depth >= 2
        ? "border-l border-l-slate-200"
        : "";
  const stickyStyle = isRoot && isSummary ? "sticky top-[32px] z-[5]" : "";

  const show = (col: string) => !hiddenColumns.has(col);
  const colW = (col: string, fallback: number) => columnWidths?.[col] ?? fallback;
  type EditableCol = "name" | "start" | "finish" | "dur" | "pct" | "assigned";
  const [activeCell, setActiveCell] = useState<EditableCol | null>(null);
  const [editValue, setEditValue] = useState("");

  const canEdit = (col: EditableCol) => !(isSummary && (col === "start" || col === "finish" || col === "dur" || col === "pct"));
  const getCellValue = (col: EditableCol) => {
    if (col === "name") return node.name;
    if (col === "start") return displayStartDate;
    if (col === "finish") return displayEndDate;
    if (col === "dur") return String(node.duration_days);
    if (col === "pct") return String(displayProgress);
    return node.assigned_to || node.responsible || "";
  };
  const startEdit = (col: EditableCol) => {
    if (!canEdit(col) || (isMilestone && col === "pct")) return;
    setActiveCell(col);
    setEditValue(getCellValue(col));
  };
  const commitEdit = (col: EditableCol) => {
    if (!onUpdateTask) return setActiveCell(null);
    const trimmed = editValue.trim();
    if (col === "name" && trimmed && trimmed !== node.name) onUpdateTask(node.id, { name: trimmed });
    if (col === "start" && trimmed && trimmed !== node.start_date) onUpdateTask(node.id, { start_date: trimmed });
    if (col === "finish" && trimmed && trimmed !== node.end_date) onUpdateTask(node.id, { end_date: trimmed });
    if (col === "dur") {
      const days = Number(trimmed);
      if (!Number.isNaN(days) && days > 0 && days !== node.duration_days) {
        const start = new Date(node.start_date); const end = new Date(start); end.setDate(start.getDate() + days - 1);
        onUpdateTask(node.id, { end_date: end.toISOString().slice(0, 10) });
      }
    }
    if (col === "pct") {
      const pct = Number(trimmed);
      if (!Number.isNaN(pct) && pct >= 0 && pct <= 100 && pct !== node.progress) onUpdateTask(node.id, { progress: Math.round(pct) });
    }
    if (col === "assigned" && trimmed !== (node.assigned_to || node.responsible || "")) onUpdateTask(node.id, { assigned_to: trimmed || null });
    setActiveCell(null);
  };

  const nameClass = depth === 0
    ? (isSummary ? "font-bold text-sm text-slate-900 uppercase tracking-wide" : "font-semibold text-sm text-slate-800")
    : depth === 1
      ? (isSummary ? "font-semibold text-sm text-slate-800" : "font-medium text-xs text-slate-700")
      : depth === 2
        ? "font-normal text-xs text-slate-500"
        : "font-light text-xs text-slate-400";

  return (
    <div className={`group hidden md:flex items-stretch border-b border-slate-200 cursor-pointer transition-colors min-h-[40px] ${bg} ${accentBorder} ${stickyStyle}`} onClick={() => onSelect(node)} onMouseEnter={() => onHoverStart?.(node.id)} onMouseLeave={() => onHoverEnd?.()}>
      {editMode ? <div className="w-7 shrink-0 flex items-center justify-center"><input type="checkbox" checked={isChecked} onChange={(e) => onCheck?.(node, e.target.checked)} className="h-4 w-4 rounded border-slate-400 accent-blue-600 cursor-pointer" /></div> : <div {...(dragHandleProps ?? {})} className="w-7 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing self-center text-slate-300 hover:text-slate-500"><GripVertical className="h-3.5 w-3.5" /></div>}
      <button className={`sticky left-0 z-[4] w-10 shrink-0 text-center text-[10px] tabular-nums border-r flex items-center justify-center ${isRowSelected ? "border-blue-200 text-blue-700 bg-blue-50" : "border-slate-200 text-slate-400 bg-white"}`} onClick={(e) => { e.stopPropagation(); onRowNumberClick?.(node, rowNumber, e); }}>{rowNumber}</button>

      <div className="flex items-start min-w-[120px] border-r border-slate-200 px-1 py-1.5" style={{ width: colW("name", 300), paddingLeft: `${8 + depth * 20}px` }} onClick={(e) => { e.stopPropagation(); startEdit("name"); }}>
        {isSummary ? <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-0.5 rounded min-w-[20px] min-h-[20px] flex items-center justify-center shrink-0 mr-1 hover:bg-slate-200" aria-label={expanded ? "Collapse" : "Expand"}>{expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}</button> : isMilestone ? <span className="w-5 shrink-0 mr-1 flex items-center justify-center text-amber-500 text-xs">◆</span> : <span className="w-5 shrink-0 mr-1" />}
        {activeCell === "name" ? <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit("name")} className="w-full min-w-0 text-xs border border-blue-300 rounded px-1 py-0.5" /> : <span className={`break-words min-w-0 ${nameClass}`}>{node.name}</span>}
        {isSummary && <div className="ml-2 flex items-center gap-1.5 shrink-0 self-center"><div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-slate-600" style={{ width: `${displayProgress}%` }} /></div><span className="text-[10px] text-slate-500 tabular-nums">{displayProgress}%</span></div>}
        <span className={`ml-auto shrink-0 md:hidden w-2.5 h-2.5 rounded-full ${isRoot ? DEPTH_ZERO_DOT_COLORS[rootIndex % 6] : "bg-slate-300"}`} title={STATUS_LABELS[node.status]} />
        {!editMode && (onAddBelow || onAddSubtask) && <div className="relative shrink-0 self-center hidden md:block ml-1"><button onClick={(e) => { e.stopPropagation(); onAddBelow?.(node); }} className="rounded p-0.5 flex items-center justify-center min-w-[20px] min-h-[20px] text-slate-400 hover:text-slate-600 hover:bg-slate-200 opacity-0 group-hover:opacity-100"><Plus className="h-3 w-3" /></button></div>}
      </div>

      {show("dur") && <div className="shrink-0 text-center text-xs border-r border-slate-200 py-1.5 flex items-center justify-center" style={{ width: colW("dur", 90) }}><span className="text-slate-600">{node.duration_days}d</span></div>}
      {show("start") && <div className="shrink-0 text-center text-xs border-r border-slate-200 py-1.5 flex items-center justify-center" style={{ width: colW("start", 110) }}>{isSummary ? <span className="text-slate-500 tabular-nums">{formatDate(displayStartDate)}</span> : <span className="text-slate-500 tabular-nums">{formatDate(displayStartDate)}</span>}</div>}
      {show("finish") && <div className="shrink-0 text-center text-xs border-r border-slate-200 py-1.5 flex items-center justify-center" style={{ width: colW("finish", 110) }}><span className="text-slate-500 tabular-nums">{formatDate(displayEndDate)}</span></div>}
      {show("pred") && <div className="hidden lg:flex shrink-0 text-center text-xs border-r py-1.5 items-center justify-center px-1 border-slate-200 text-slate-500" style={{ width: colW("pred", 120) }}><span className="break-words min-w-0">{node.predecessors || ""}</span></div>}
      {show("pct") && <div className="shrink-0 text-center text-xs border-r border-slate-200 py-1.5 flex items-center justify-center">{isSummary ? <span className="text-slate-500 tabular-nums">{displayProgress}%</span> : isMilestone ? <span className="text-slate-400">—</span> : <span className="text-slate-600 tabular-nums" onClick={(e) => { e.stopPropagation(); startEdit("pct"); }}>{displayProgress}%</span>}</div>}
      {show("status") && <div className="hidden lg:flex shrink-0 items-center justify-center border-r py-1.5 border-slate-200" style={{ width: colW("status", 120) }}><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${STATUS_TASK_BADGE_STYLES[displayStatus]}`}><span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[displayStatus]}`} />{STATUS_LABELS[displayStatus]}</span></div>}
      {show("delays") && <div className="shrink-0 flex items-center justify-center border-r py-1.5 border-slate-200" style={{ width: colW("delays", 80) }}><button onClick={(e) => { e.stopPropagation(); onLogDelay?.(node); }} className="min-w-[32px] min-h-[28px] flex items-center justify-center rounded text-slate-300 hover:text-slate-500 hover:bg-slate-200/50"><AlertTriangle className="h-3 w-3" />{delayCount > 0 && <span className="text-[10px] font-bold ml-0.5">{delayCount}</span>}</button></div>}
      {show("assigned") && <div className="hidden lg:flex shrink-0 text-xs py-1.5 items-center justify-center px-1 text-slate-500" style={{ width: colW("assigned", 140) }}><span className="break-words min-w-0 text-center">{node.assigned_to || node.responsible || ""}</span></div>}
    </div>
  );
}

interface MobileTaskCardProps {
  node: SitePlanTaskNode;
  onSelect: (task: SitePlanTaskNode) => void;
  onLogDelay?: (task: SitePlanTaskNode) => void;
  onProgressTap?: (task: SitePlanTaskNode) => void;
  delayCount?: number;
  mobileExpanded: boolean;
  onToggleMobileExpand: () => void;
  depth: number;
  rootIndex: number;
}

export function MobileTaskCard({ node, onSelect, onLogDelay, onProgressTap, delayCount = 0, mobileExpanded, onToggleMobileExpand, depth, rootIndex }: MobileTaskCardProps) {
  const isSummary = node.children.length > 0;
  const displayProgress = isSummary ? (computeSummaryStats(node.children)?.progress ?? node.progress) : node.progress;
  const dotClass = depth === 0 ? DEPTH_ZERO_DOT_COLORS[rootIndex % 6] : depth === 1 ? "bg-slate-400" : "bg-slate-300";
  const nameClass = depth === 0 ? (isSummary ? "font-semibold text-slate-900" : "font-medium text-slate-900") : depth === 1 ? (isSummary ? "font-semibold text-slate-800" : "font-medium text-slate-800") : "text-sm text-slate-500";
  const status: Record<TaskStatus, string> = { not_started: "Not started", in_progress: "In progress", completed: "Completed", delayed: "Delayed", on_hold: "On hold" };

  return (
    <div className="md:hidden border-b border-slate-200 bg-white"><div className="px-3 py-2.5 min-h-[72px]" style={{ paddingLeft: `${12 + depth * 12}px` }}><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} /><button className="min-w-0 flex-1 text-left" onClick={() => onSelect(node)}><span className={`block truncate text-sm ${nameClass}`}>{node.name}</span></button><span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">{status[node.status]}</span></div><div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{formatDate(node.start_date)} → {formatDate(node.end_date)}</span><span>{node.assigned_to || node.responsible || "Unassigned"}</span></div><div className="mt-1.5 flex items-center gap-2"><button type="button" onClick={() => onProgressTap?.(node)} className="flex min-h-[44px] flex-1 items-center gap-2 rounded-md px-1"><ProgressBar value={displayProgress} className="flex-1" /><span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">{displayProgress}%</span></button><button onClick={onToggleMobileExpand} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white" aria-label={mobileExpanded ? "Collapse actions" : "Expand actions"}><ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${mobileExpanded ? "rotate-180" : ""}`} /></button></div>{mobileExpanded && <div className="mt-2 space-y-2 border-t border-slate-100 pt-2"><div className="flex items-center gap-2"><button onClick={() => onLogDelay?.(node)} className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md bg-red-50 px-3 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" />Delay log{delayCount > 0 ? ` (${delayCount})` : ""}</button><button onClick={() => onSelect(node)} className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-700"><Pencil className="h-3.5 w-3.5" />Edit</button></div></div>}</div></div>
  );
}
