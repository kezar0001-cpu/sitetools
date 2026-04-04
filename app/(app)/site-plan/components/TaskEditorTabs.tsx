"use client";

import { useState } from "react";
import type { SitePlanTask, SitePlanProgressLog, SitePlanDelayLog, UpdateTaskPayload, TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import { STATUS_BADGE_STYLES } from "@/lib/sitePlanColors";
import type { CompanyMember } from "@/hooks/useCompanyMembers";
import { ProgressSlider } from "./ProgressSlider";

type Tab = "details" | "progress_status" | "history_notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "progress_status", label: "Progress & Status" },
  { id: "history_notes", label: "History & Notes" },
];

interface TaskEditorTabsProps {
  task: SitePlanTask;
  form: UpdateTaskPayload;
  onChange: <K extends keyof UpdateTaskPayload>(key: K, val: UpdateTaskPayload[K]) => void;
  savedField: string | null;
  members: CompanyMember[];
  logs: SitePlanProgressLog[];
  delayLogs: SitePlanDelayLog[];
  progressNote: string;
  onProgressNoteChange: (v: string) => void;
  onAddSubtask?: () => void;
  dateError?: string | null;
}

/** CSS ring applied to a field that was just saved (green flash). */
function savedClass(savedField: string | null, fieldName: string) {
  return savedField === fieldName
    ? "ring-2 ring-green-400 transition-all duration-300"
    : "transition-all duration-300";
}

// ─── MemberCombobox ──────────────────────────────────────────

function MemberCombobox({
  value,
  onChange,
  members,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  members: CompanyMember[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${className}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setInputValue(m.name);
                onChange(m.name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{m.name}</span>
              {m.email && (
                <span className="text-xs text-slate-400 truncate ml-auto">
                  {m.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab panels ──────────────────────────────────────────────

function DetailsTab({
  task,
  form,
  onChange,
  savedField,
  members,
  onAddSubtask,
  dateError,
}: Pick<TaskEditorTabsProps, "task" | "form" | "onChange" | "savedField" | "members" | "onAddSubtask" | "dateError">) {
  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Task Name
        </label>
        <input
          type="text"
          value={form.name ?? ""}
          onChange={(e) => onChange("name", e.target.value)}
          className={`w-full text-lg font-semibold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${savedClass(savedField, "name")}`}
        />
      </div>

      {/* Type + WBS Code */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Type
          </label>
          <div className="flex items-center min-h-[44px] border border-slate-100 rounded-lg px-3 bg-slate-50">
            <span className="text-sm font-medium text-slate-700 capitalize">
              {task.type}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            WBS Code
          </label>
          <div className="flex items-center min-h-[44px] border border-slate-100 rounded-lg px-3 bg-slate-50">
            <span className="text-sm font-mono text-slate-700">
              {task.wbs_code || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Planned dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Planned Start
          </label>
          <input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => onChange("start_date", e.target.value)}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "start_date")}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Planned End
          </label>
          <input
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => onChange("end_date", e.target.value)}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "end_date")}`}
          />
        </div>
      </div>

      {dateError && (
        <p className="text-xs text-red-600">{dateError}</p>
      )}

      {/* Responsible */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Responsible
        </label>
        <MemberCombobox
          value={form.responsible ?? ""}
          onChange={(val) => onChange("responsible", val || null)}
          members={members}
          placeholder="Name or trade"
          className={savedClass(savedField, "responsible")}
        />
      </div>

      {/* Assigned To */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Assigned To
        </label>
        <MemberCombobox
          value={form.assigned_to ?? ""}
          onChange={(val) => onChange("assigned_to", val || null)}
          members={members}
          placeholder="Person or team"
          className={savedClass(savedField, "assigned_to")}
        />
      </div>

      {/* Predecessors */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Predecessors
        </label>
        <input
          type="text"
          value={form.predecessors ?? ""}
          onChange={(e) => onChange("predecessors", e.target.value || null)}
          placeholder="e.g. 1, 3FS+2d"
          className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "predecessors")}`}
        />
      </div>

      {/* Add subtask */}
      {onAddSubtask && (
        <button
          onClick={onAddSubtask}
          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
        >
          + Add Subtask
        </button>
      )}
    </div>
  );
}

function ProgressStatusTab({
  task,
  form,
  onChange,
  savedField,
  progressNote,
  onProgressNoteChange,
}: Pick<TaskEditorTabsProps, "task" | "form" | "onChange" | "savedField" | "progressNote" | "onProgressNoteChange">) {
  const currentStatus = (form.status ?? task.status) as TaskStatus;

  return (
    <div className="space-y-5">
      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Status
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_BADGE_STYLES[currentStatus]}`}
          >
            {STATUS_LABELS[currentStatus]}
          </span>
          <select
            value={currentStatus}
            onChange={(e) => onChange("status", e.target.value as TaskStatus)}
            className={`flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "status")}`}
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress slider */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Progress
        </label>
        <ProgressSlider
          value={form.progress ?? task.progress}
          onChange={(v) => onChange("progress", v)}
        />
      </div>

      {/* Actual dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Actual Start
          </label>
          <input
            type="date"
            value={form.actual_start ?? ""}
            onChange={(e) => onChange("actual_start", e.target.value || null)}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "actual_start")}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Actual End
          </label>
          <input
            type="date"
            value={form.actual_end ?? ""}
            onChange={(e) => onChange("actual_end", e.target.value || null)}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "actual_end")}`}
          />
        </div>
      </div>

      {/* Progress note */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Progress Update Note
        </label>
        <textarea
          value={progressNote}
          onChange={(e) => onProgressNoteChange(e.target.value)}
          rows={3}
          placeholder="Describe what was done since last update..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Saved with the next progress change.
        </p>
      </div>
    </div>
  );
}

function HistoryNotesTab({
  form,
  onChange,
  savedField,
  logs,
  delayLogs,
}: Pick<TaskEditorTabsProps, "form" | "onChange" | "savedField" | "logs" | "delayLogs">) {
  return (
    <div className="space-y-6">
      {/* Progress log timeline */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Progress Log
        </label>
        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No progress updates yet.</p>
        ) : (
          <div className="relative space-y-0 border-l-2 border-slate-100 ml-2">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-4 pb-4">
                {/* Timeline dot */}
                <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-400 border border-white" />
                <div className="text-xs text-slate-700 font-medium">
                  {log.progress_before}% → {log.progress_after}%
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {new Date(log.logged_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                {log.note && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {log.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delay log list */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Delay Log
        </label>
        {delayLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No delays logged.</p>
        ) : (
          <div className="space-y-2">
            {delayLogs.map((dl) => (
              <div
                key={dl.id}
                className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    {dl.delay_category}
                  </span>
                  <span className="font-medium text-red-800">
                    +{dl.delay_days}d
                  </span>
                  <span className="text-slate-400 ml-auto">
                    {new Date(dl.logged_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{dl.delay_reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Notes
        </label>
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => onChange("notes", e.target.value || null)}
          rows={4}
          placeholder="Add notes..."
          className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedClass(savedField, "notes")}`}
        />
      </div>

      {/* Comments */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Comments
        </label>
        <textarea
          value={form.comments ?? ""}
          onChange={(e) => onChange("comments", e.target.value || null)}
          rows={3}
          placeholder="Add comments..."
          className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedClass(savedField, "comments")}`}
        />
      </div>
    </div>
  );
}

// ─── TaskEditorTabs ──────────────────────────────────────────

/**
 * Tabbed form interface for editing task fields.
 * Tabs: Details | Progress & Status | History & Notes
 */
export function TaskEditorTabs({
  task,
  form,
  onChange,
  savedField,
  members,
  logs,
  delayLogs,
  progressNote,
  onProgressNoteChange,
  onAddSubtask,
  dateError,
}: TaskEditorTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  return (
    <div className="flex flex-col min-h-0">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "details" && (
          <DetailsTab
            task={task}
            form={form}
            onChange={onChange}
            savedField={savedField}
            members={members}
            onAddSubtask={onAddSubtask}
            dateError={dateError}
          />
        )}
        {activeTab === "progress_status" && (
          <ProgressStatusTab
            task={task}
            form={form}
            onChange={onChange}
            savedField={savedField}
            progressNote={progressNote}
            onProgressNoteChange={onProgressNoteChange}
          />
        )}
        {activeTab === "history_notes" && (
          <HistoryNotesTab
            form={form}
            onChange={onChange}
            savedField={savedField}
            logs={logs}
            delayLogs={delayLogs}
          />
        )}
      </div>
    </div>
  );
}
