"use client";

import { useState } from "react";
import type { SitePlanTask, SitePlanProgressLog, UpdateTaskPayload, TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import type { CompanyMember } from "@/hooks/useCompanyMembers";
import { ProgressSlider } from "./ProgressSlider";

type Tab = "details" | "dates" | "progress" | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "dates", label: "Dates" },
  { id: "progress", label: "Progress" },
  { id: "notes", label: "Notes" },
];

interface TaskEditorTabsProps {
  task: SitePlanTask;
  form: UpdateTaskPayload;
  onChange: <K extends keyof UpdateTaskPayload>(key: K, val: UpdateTaskPayload[K]) => void;
  savedField: string | null;
  members: CompanyMember[];
  logs: SitePlanProgressLog[];
  onAddSubtask?: () => void;
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
}: Pick<TaskEditorTabsProps, "task" | "form" | "onChange" | "savedField" | "members" | "onAddSubtask">) {
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

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Status
        </label>
        <select
          value={form.status ?? task.status}
          onChange={(e) => onChange("status", e.target.value as TaskStatus)}
          className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[44px] ${savedClass(savedField, "status")}`}
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
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

      {/* Comments */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Comments
        </label>
        <textarea
          value={form.comments ?? ""}
          onChange={(e) => onChange("comments", e.target.value || null)}
          rows={2}
          placeholder="Add comments..."
          className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedClass(savedField, "comments")}`}
        />
      </div>

      {/* Add subtask */}
      {task.type !== "subtask" && onAddSubtask && (
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

function DatesTab({
  form,
  onChange,
  savedField,
}: Pick<TaskEditorTabsProps, "form" | "onChange" | "savedField">) {
  return (
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
  );
}

function ProgressTab({
  task,
  form,
  onChange,
  logs,
}: Pick<TaskEditorTabsProps, "task" | "form" | "onChange" | "logs">) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Progress
        </label>
        <ProgressSlider
          value={form.progress ?? task.progress}
          onChange={(v) => onChange("progress", v)}
        />
      </div>

      {logs.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            Progress History
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="text-xs text-slate-500 flex items-center gap-2"
              >
                <span>
                  {log.progress_before}% → {log.progress_after}%
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  {new Date(log.logged_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {log.note && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="truncate">{log.note}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotesTab({
  form,
  onChange,
  savedField,
}: Pick<TaskEditorTabsProps, "form" | "onChange" | "savedField">) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        Notes
      </label>
      <textarea
        value={form.notes ?? ""}
        onChange={(e) => onChange("notes", e.target.value || null)}
        rows={8}
        placeholder="Add notes..."
        className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none ${savedClass(savedField, "notes")}`}
      />
    </div>
  );
}

// ─── TaskEditorTabs ──────────────────────────────────────────

/**
 * Tabbed form interface for editing task fields.
 * Tabs: Details | Dates | Progress | Notes
 */
export function TaskEditorTabs({
  task,
  form,
  onChange,
  savedField,
  members,
  logs,
  onAddSubtask,
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
          />
        )}
        {activeTab === "dates" && (
          <DatesTab form={form} onChange={onChange} savedField={savedField} />
        )}
        {activeTab === "progress" && (
          <ProgressTab
            task={task}
            form={form}
            onChange={onChange}
            logs={logs}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab form={form} onChange={onChange} savedField={savedField} />
        )}
      </div>
    </div>
  );
}
