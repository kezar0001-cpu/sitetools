"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import type { SitePlanTaskNode } from "@/types/siteplan";
import { StatusBadge } from "./StatusBadge";

interface TaskRowProps {
  node: SitePlanTaskNode;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (task: SitePlanTaskNode) => void;
}

const rowStyles = {
  phase: "bg-slate-100 dark:bg-slate-800 border-l-4 border-blue-500 font-semibold",
  task: "bg-white dark:bg-slate-900",
  subtask: "bg-slate-50 dark:bg-slate-850",
};

const indentMap = {
  phase: "pl-4",
  task: "pl-8",
  subtask: "pl-12",
};

const textStyles = {
  phase: "text-base font-semibold text-slate-900",
  task: "text-sm font-normal text-slate-800",
  subtask: "text-xs text-slate-500",
};

export function TaskRow({ node, expanded, onToggle, onSelect }: TaskRowProps) {
  const hasChildren = node.children.length > 0;

  return (
    <div
      className={`flex items-center gap-2 py-3 px-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50/80 transition-colors min-h-[44px] ${rowStyles[node.type]}`}
      onClick={() => onSelect(node)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(node);
      }}
    >
      {/* Indent + expand/collapse */}
      <div className={`flex items-center ${indentMap[node.type]}`}>
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 rounded hover:bg-slate-200 min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </button>
        ) : (
          <span className="w-7" />
        )}
      </div>

      {/* WBS code */}
      <span className="text-xs text-slate-400 font-mono w-12 shrink-0">
        {node.wbs_code}
      </span>

      {/* Task name */}
      <span className={`flex-1 truncate ${textStyles[node.type]}`}>
        {node.name}
      </span>

      {/* Status badge */}
      <StatusBadge status={node.status} />

      {/* Progress */}
      <span className="text-xs font-medium text-slate-500 tabular-nums w-10 text-right">
        {node.progress}%
      </span>

      {/* Dates — hidden on mobile */}
      <span className="hidden md:inline text-xs text-slate-400 w-20 text-right">
        {node.start_date}
      </span>
      <span className="hidden md:inline text-xs text-slate-400 w-20 text-right">
        {node.end_date}
      </span>

      {/* Responsible — hidden on mobile */}
      <span className="hidden lg:inline text-xs text-slate-400 w-24 truncate text-right">
        {node.responsible ?? "—"}
      </span>
    </div>
  );
}
