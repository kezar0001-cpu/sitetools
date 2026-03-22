"use client";

import { useState, useMemo } from "react";
import { User, Clock, GitMerge, RefreshCw, Calendar, BarChart2 } from "lucide-react";
import type { ConflictEntry, ConflictField } from "@/hooks/useConflictDetection";
import {
  CONFLICT_FIELD_LABELS,
  TEXT_CONFLICT_FIELDS,
  DATE_CONFLICT_FIELDS,
  PROGRESS_CONFLICT_FIELDS,
} from "@/hooks/useConflictDetection";
import type { UpdateTaskPayload } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import type { TaskStatus } from "@/types/siteplan";
import type { useCompanyMembers } from "@/hooks/useCompanyMembers";

// ─── Utilities ────────────────────────────────────────────────

type DiffSegment = { text: string; type: "equal" | "insert" | "delete" };

/** LCS-based character-level diff between two strings. Capped at 500 chars each. */
function computeCharDiff(local: string, remote: string): DiffSegment[] {
  const MAX = 500;
  if (local.length > MAX || remote.length > MAX) {
    return [{ text: local, type: "delete" }, { text: remote, type: "insert" }];
  }

  const m = local.length, n = remote.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        local[i - 1] === remote[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw: DiffSegment[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
      raw.unshift({ text: local[i - 1], type: "equal" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ text: remote[j - 1], type: "insert" });
      j--;
    } else {
      raw.unshift({ text: local[i - 1], type: "delete" });
      i--;
    }
  }

  const merged: DiffSegment[] = [];
  for (const seg of raw) {
    if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

/** Compute the number of days difference and a human-readable delta string. */
function computeDateDelta(
  localDate: string | null | undefined,
  remoteDate: string | null | undefined
): { days: number; label: string } | null {
  if (!localDate || !remoteDate) return null;
  const local = new Date(localDate);
  const remote = new Date(remoteDate);
  if (isNaN(local.getTime()) || isNaN(remote.getTime())) return null;
  const diffDays = Math.round(
    (remote.getTime() - local.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return { days: 0, label: "same day" };
  const abs = Math.abs(diffDays);
  const direction = diffDays > 0 ? "later" : "earlier";
  return { days: diffDays, label: `${abs} day${abs !== 1 ? "s" : ""} ${direction}` };
}

/** Return the ISO date (YYYY-MM-DD) halfway between two ISO date strings. */
function computeDateMidpoint(date1: string, date2: string): string {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const mid = new Date((d1.getTime() + d2.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatDateValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  const d = new Date(value as string);
  return isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatConflictValue(field: ConflictField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  switch (field) {
    case "status":
      return STATUS_LABELS[value as TaskStatus] ?? String(value);
    case "progress":
      return `${value}%`;
    case "start_date":
    case "end_date":
    case "actual_start":
    case "actual_end":
      return formatDateValue(value);
    default:
      return String(value);
  }
}

// ─── ConflictCard ─────────────────────────────────────────────

interface ConflictCardProps {
  conflict: ConflictEntry;
  localValue: unknown;
  members: ReturnType<typeof useCompanyMembers>["data"];
  onKeepLocal: (remember: boolean) => void;
  onUseRemote: (remember: boolean) => void;
  onApplyMerge: (resolvedValue: unknown, remember: boolean) => void;
}

function ConflictCard({
  conflict,
  localValue,
  members,
  onKeepLocal,
  onUseRemote,
  onApplyMerge,
}: ConflictCardProps) {
  const [mergeOpen, setMergeOpen] = useState(false);
  // Text merge state
  const [mergeText, setMergeText] = useState(String(localValue ?? ""));
  const [remember, setRemember] = useState(false);

  const isTextField = TEXT_CONFLICT_FIELDS.has(conflict.field);
  const isDateField = DATE_CONFLICT_FIELDS.has(conflict.field);
  const isProgressField = PROGRESS_CONFLICT_FIELDS.has(conflict.field);
  const label = CONFLICT_FIELD_LABELS[conflict.field];

  const changedByMember = members?.find((m) => m.id === conflict.changedBy);
  const changedByName = changedByMember?.name ?? "Another user";

  // Text diff segments (only computed when merge panel is open)
  const diffSegments = useMemo(() => {
    if (!isTextField || !mergeOpen) return null;
    return computeCharDiff(
      String(localValue ?? ""),
      String(conflict.remoteValue ?? "")
    );
  }, [isTextField, mergeOpen, localValue, conflict.remoteValue]);

  // Date delta metadata
  const dateDelta = useMemo(() => {
    if (!isDateField) return null;
    return computeDateDelta(
      localValue as string | null,
      conflict.remoteValue as string | null
    );
  }, [isDateField, localValue, conflict.remoteValue]);

  // Date midpoint
  const dateMidpoint = useMemo(() => {
    if (!isDateField || !localValue || !conflict.remoteValue) return null;
    try {
      return computeDateMidpoint(
        localValue as string,
        conflict.remoteValue as string
      );
    } catch {
      return null;
    }
  }, [isDateField, localValue, conflict.remoteValue]);

  // Progress average
  const progressAverage = useMemo(() => {
    if (!isProgressField) return null;
    const local = Number(localValue);
    const remote = Number(conflict.remoteValue);
    if (isNaN(local) || isNaN(remote)) return null;
    return Math.round((local + remote) / 2);
  }, [isProgressField, localValue, conflict.remoteValue]);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold text-amber-800">
          {label} conflict
        </span>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <User className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700">{changedByName}</span>
          <span className="text-[11px] text-amber-500">·</span>
          <Clock className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700">
            {relativeTime(conflict.changedAt)}
          </span>
        </div>
      </div>

      {/* Side-by-side values */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Your version
          </span>
          <div className="text-xs text-slate-700 bg-white border border-blue-200 rounded p-2 min-h-[32px] break-words whitespace-pre-wrap">
            {formatConflictValue(conflict.field, localValue)}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Their version
          </span>
          <div className="text-xs text-slate-700 bg-white border border-amber-200 rounded p-2 min-h-[32px] break-words whitespace-pre-wrap">
            {formatConflictValue(conflict.field, conflict.remoteValue)}
          </div>
        </div>
      </div>

      {/* ── Date field: delta badge ── */}
      {isDateField && dateDelta && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
          <span>
            Remote is{" "}
            <span
              className={
                dateDelta.days > 0
                  ? "font-semibold text-amber-700"
                  : dateDelta.days < 0
                  ? "font-semibold text-blue-700"
                  : "font-semibold"
              }
            >
              {dateDelta.label}
            </span>{" "}
            than your version
          </span>
        </div>
      )}

      {/* ── Progress field: visual comparison ── */}
      {isProgressField && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <BarChart2 className="h-3 w-3 shrink-0" />
            <span>Progress comparison</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-12 shrink-0">Yours</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Number(localValue) || 0)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-600 w-8 text-right">
                {Number(localValue)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-12 shrink-0">Theirs</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Number(conflict.remoteValue) || 0)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-600 w-8 text-right">
                {Number(conflict.remoteValue)}%
              </span>
            </div>
            {progressAverage !== null && (
              <div className="flex items-center gap-2 opacity-60">
                <span className="text-[10px] text-slate-500 w-12 shrink-0">Average</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${progressAverage}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-600 w-8 text-right">
                  {progressAverage}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Text field: character diff panel ── */}
      {mergeOpen && isTextField && (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Character diff
          </div>
          <div className="text-xs font-mono leading-relaxed bg-white border border-slate-200 rounded p-2 break-all">
            {diffSegments?.map((seg, idx) => (
              <span
                key={idx}
                className={
                  seg.type === "equal"
                    ? "text-slate-700"
                    : seg.type === "insert"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-700 line-through"
                }
              >
                {seg.text}
              </span>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Edit result
            </div>
            <textarea
              value={mergeText}
              onChange={(e) => setMergeText(e.target.value)}
              rows={3}
              className="w-full text-xs border border-slate-200 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onKeepLocal(remember)}
            className="px-2 py-1 text-[10px] font-medium bg-white border border-blue-300 rounded hover:bg-blue-50 text-blue-700"
          >
            Keep Local
          </button>

          {/* Text: toggle diff/merge panel */}
          {isTextField && (
            <button
              onClick={() => {
                setMergeText(String(localValue ?? ""));
                setMergeOpen((v) => !v);
              }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium border rounded ${
                mergeOpen
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <GitMerge className="h-3 w-3" />
              Merge
            </button>
          )}

          {/* Date: midpoint option */}
          {isDateField && dateMidpoint && (
            <button
              onClick={() => onApplyMerge(dateMidpoint, remember)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
              title={`Use midpoint: ${formatDateValue(dateMidpoint)}`}
            >
              <Calendar className="h-3 w-3" />
              Midpoint ({formatDateValue(dateMidpoint)})
            </button>
          )}

          {/* Progress: average option */}
          {isProgressField && progressAverage !== null && (
            <button
              onClick={() => onApplyMerge(progressAverage, remember)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-white border border-emerald-300 rounded hover:bg-emerald-50 text-emerald-700"
            >
              <BarChart2 className="h-3 w-3" />
              Use Average ({progressAverage}%)
            </button>
          )}

          <button
            onClick={() => onUseRemote(remember)}
            className="px-2 py-1 text-[10px] font-medium bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Use Remote
          </button>

          {/* Text: apply manual merge */}
          {mergeOpen && isTextField && (
            <button
              onClick={() => onApplyMerge(mergeText, remember)}
              className="px-2 py-1 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Merge
            </button>
          )}
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-3 h-3 rounded border-slate-300 accent-blue-600"
          />
          <span className="text-[10px] text-slate-500">
            Remember my choice for {label}
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── ConflictResolutionPanel ──────────────────────────────────

interface ConflictResolutionPanelProps {
  conflicts: ConflictEntry[];
  form: UpdateTaskPayload;
  members: ReturnType<typeof useCompanyMembers>["data"];
  onKeepLocal: (field: ConflictField, remember: boolean) => void;
  onUseRemote: (field: ConflictField, remoteValue: unknown, remember: boolean) => void;
  onApplyMerge: (field: ConflictField, resolvedValue: unknown, remember: boolean) => void;
}

/**
 * Renders all active conflicts for a task, one ConflictCard per field.
 * Handles text (char-level diff + manual edit), date (delta + midpoint),
 * and progress (visual bars + average) field types.
 */
export function ConflictResolutionPanel({
  conflicts,
  form,
  members,
  onKeepLocal,
  onUseRemote,
  onApplyMerge,
}: ConflictResolutionPanelProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="mx-4 mt-3 space-y-2 shrink-0">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        {conflicts.length === 1
          ? "1 field edited remotely while you were typing"
          : `${conflicts.length} fields edited remotely while you were typing`}
      </div>
      {conflicts.map((conflict) => (
        <ConflictCard
          key={conflict.field}
          conflict={conflict}
          localValue={form[conflict.field as keyof UpdateTaskPayload]}
          members={members}
          onKeepLocal={(remember) => onKeepLocal(conflict.field, remember)}
          onUseRemote={(remember) =>
            onUseRemote(conflict.field, conflict.remoteValue, remember)
          }
          onApplyMerge={(resolvedValue, remember) =>
            onApplyMerge(conflict.field, resolvedValue, remember)
          }
        />
      ))}
    </div>
  );
}
