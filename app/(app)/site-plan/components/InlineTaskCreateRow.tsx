"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateTask } from "@/hooks/useSitePlanTasks";
import type { SitePlanTask, TaskType } from "@/types/siteplan";

interface InlineTaskCreateRowProps {
  projectId: string;
  parentId: string | null;
  type: TaskType;
  sortOrder: number;
  hiddenColumns?: Set<string>;
  columnWidths?: Record<string, number>;
  autoFocusName?: boolean;
  onCreated?: (task: SitePlanTask) => void;
  onCancel: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e.getTime() - s.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function InlineTaskCreateRow({
  projectId,
  parentId,
  type,
  sortOrder,
  hiddenColumns = new Set(),
  columnWidths,
  autoFocusName = false,
  onCreated,
  onCancel,
}: InlineTaskCreateRowProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [assignedTo, setAssignedTo] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  const durationDays = useMemo(
    () => daysBetweenInclusive(startDate, endDate),
    [startDate, endDate]
  );

  useEffect(() => {
    if (autoFocusName) nameRef.current?.focus();
  }, [autoFocusName]);

  const colW = (col: string, fallback: number) => columnWidths?.[col] ?? fallback;
  const show = (col: string) => !hiddenColumns.has(col);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || createTask.isPending) return;

    createTask.mutate(
      {
        project_id: projectId,
        parent_id: parentId,
        name: trimmed,
        type,
        start_date: startDate,
        end_date: endDate,
        assigned_to: assignedTo.trim() || undefined,
        sort_order: sortOrder,
      },
      {
        onSuccess: (task) => {
          setName("");
          setAssignedTo("");
          setStartDate(todayISO());
          setEndDate(todayISO());
          onCreated?.(task);
        },
      }
    );
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="hidden md:flex items-stretch min-h-[40px] border-b border-blue-200 bg-blue-50/60"
      onKeyDown={onKeyDown}
    >
      <div className="w-7 shrink-0" />
      <div className="w-10 shrink-0 border-r border-blue-200" />

      <div className="flex items-center border-r border-blue-200 px-2" style={{ width: colW("name", 300) }}>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="+ Task Name"
          className="w-full bg-transparent text-xs text-slate-900 placeholder:text-blue-500/80 outline-none"
        />
      </div>

      {show("dur") && (
        <div className="shrink-0 border-r border-blue-200 text-xs text-slate-500 flex items-center justify-center" style={{ width: colW("dur", 90) }}>
          {durationDays}d
        </div>
      )}

      {show("start") && (
        <div className="shrink-0 border-r border-blue-200 flex items-center justify-center px-1" style={{ width: colW("start", 110) }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-xs bg-white border border-blue-200 rounded px-1 py-0.5 outline-none"
          />
        </div>
      )}

      {show("finish") && (
        <div className="shrink-0 border-r border-blue-200 flex items-center justify-center px-1" style={{ width: colW("finish", 110) }}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-xs bg-white border border-blue-200 rounded px-1 py-0.5 outline-none"
          />
        </div>
      )}

      {show("pred") && (
        <div className="hidden lg:flex shrink-0 border-r border-blue-200 items-center justify-center text-xs text-slate-400" style={{ width: colW("pred", 120) }}>
          —
        </div>
      )}

      {show("pct") && (
        <div className="shrink-0 border-r border-blue-200 flex items-center justify-center text-xs text-slate-500" style={{ width: colW("pct", 90) }}>
          0%
        </div>
      )}

      {show("status") && (
        <div className="shrink-0 border-r border-blue-200 flex items-center justify-center px-1" style={{ width: colW("status", 120) }}>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">Not Started</span>
        </div>
      )}

      {show("delays") && (
        <div className="shrink-0 border-r border-blue-200 flex items-center justify-center text-xs text-slate-400" style={{ width: colW("delays", 80) }}>
          0
        </div>
      )}

      {show("assigned") && (
        <div className="shrink-0 flex items-center px-1" style={{ width: colW("assigned", 140) }}>
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Assigned To"
            className="w-full text-xs bg-white border border-blue-200 rounded px-1 py-0.5 outline-none"
          />
        </div>
      )}
    </div>
  );
}
