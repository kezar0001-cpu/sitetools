"use client";

import { useMemo, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import type { SitePlanTask, SitePlanTaskNode } from "@/types/siteplan";
import { buildTaskTree, flattenTree } from "@/types/siteplan";

const statusBarColors: Record<string, { bg: string; bgProgress: string }> = {
  not_started: { bg: "#cbd5e1", bgProgress: "#94a3b8" },
  in_progress: { bg: "#93c5fd", bgProgress: "#3b82f6" },
  completed: { bg: "#86efac", bgProgress: "#22c55e" },
  delayed: { bg: "#fca5a5", bgProgress: "#ef4444" },
  on_hold: { bg: "#fcd34d", bgProgress: "#f59e0b" },
};

interface GanttWrapperProps {
  tasks: SitePlanTask[];
  onTaskClick?: (task: SitePlanTask) => void;
}

export function GanttWrapper({ tasks, onTaskClick }: GanttWrapperProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

  const ganttTasks: Task[] = useMemo(() => {
    if (tasks.length === 0) return [];
    const tree = buildTaskTree(tasks);
    const flat = flattenTree(tree);

    return flat.map((node) => {
      const colors = statusBarColors[node.status] ?? statusBarColors.not_started;
      const isPhase = node.type === "phase";

      // For phases, compute span from children
      let start = new Date(node.start_date);
      let end = new Date(node.end_date);
      if (isPhase && node.children.length > 0) {
        const childStarts = node.children.map((c) => new Date(c.start_date).getTime());
        const childEnds = node.children.map((c) => new Date(c.end_date).getTime());
        start = new Date(Math.min(...childStarts));
        end = new Date(Math.max(...childEnds));
      }

      // Ensure end is after start
      if (end <= start) {
        end = new Date(start.getTime() + 86400000);
      }

      return {
        id: node.id,
        name: `${node.wbs_code} ${node.name}`,
        start,
        end,
        progress: node.progress,
        type: isPhase ? "project" : "task",
        hideChildren: false,
        styles: {
          backgroundColor: colors.bg,
          backgroundSelectedColor: colors.bg,
          progressColor: colors.bgProgress,
          progressSelectedColor: colors.bgProgress,
        },
      } satisfies Task;
    });
  }, [tasks]);

  const handleClick = (ganttTask: Task) => {
    const original = tasks.find((t) => t.id === ganttTask.id);
    if (original && onTaskClick) onTaskClick(original);
  };

  if (ganttTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No tasks to display. Add tasks to see the Gantt chart.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
        <span className="text-xs font-medium text-slate-500 mr-2">Zoom:</span>
        {[
          { label: "Day", mode: ViewMode.Day },
          { label: "Week", mode: ViewMode.Week },
          { label: "Month", mode: ViewMode.Month },
        ].map(({ label, mode }) => (
          <button
            key={label}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md min-h-[32px] ${
              viewMode === mode
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Gantt chart */}
      <div className="min-w-[600px]">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onClick={handleClick}
          listCellWidth=""
          columnWidth={
            viewMode === ViewMode.Day
              ? 60
              : viewMode === ViewMode.Week
              ? 200
              : 300
          }
          todayColor="rgba(239, 68, 68, 0.1)"
          barCornerRadius={4}
          fontSize="12"
          rowHeight={40}
          headerHeight={50}
        />
      </div>
    </div>
  );
}
