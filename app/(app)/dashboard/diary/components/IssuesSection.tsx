"use client";

import { FormEvent, useState } from "react";
import { addIssue, deleteIssue } from "@/lib/diary/client";
import type { SiteDiaryFull, SiteDiaryIssue, IssueType } from "@/lib/diary/types";
import { SectionHeader } from "./SectionHeader";

const ISSUE_TYPES: IssueType[] = ["Safety", "Delay", "RFI", "Instruction", "NCR"];

const ISSUE_COLORS: Record<IssueType, { bg: string; border: string; text: string; icon: string }> = {
  Safety: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "text-red-500" },
  Delay: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" },
  RFI: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "text-blue-500" },
  Instruction: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "text-purple-500" },
  NCR: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500" },
};

interface FieldErrorProps {
  msg?: string;
}

function FieldError({ msg }: FieldErrorProps) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

interface IssuesSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
}

export function IssuesSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: IssuesSectionProps) {
  const [issueForm, setIssueForm] = useState({
    type: "Safety" as IssueType,
    description: "",
    responsible_party: "",
    delay_hours: "",
  });
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});
  const [addingIssue, setAddingIssue] = useState(false);
  const [deletingIssueId, setDeletingIssueId] = useState<string | null>(null);

  function validateIssueForm() {
    const errors: Record<string, string> = {};
    if (!issueForm.description.trim()) {
      errors.description = "Description is required";
    }
    if (issueForm.delay_hours && isNaN(parseFloat(issueForm.delay_hours))) {
      errors.delay_hours = "Must be a valid number";
    }
    return errors;
  }

  async function handleAddIssue(e: FormEvent) {
    e.preventDefault();
    const errors = validateIssueForm();
    if (Object.keys(errors).length > 0) {
      setIssueErrors(errors);
      return;
    }
    setIssueErrors({});
    setAddingIssue(true);
    try {
      const row = await addIssue(diary.id, {
        type: issueForm.type,
        description: issueForm.description.trim(),
        responsible_party: issueForm.responsible_party.trim() || null,
        delay_hours: issueForm.delay_hours ? parseFloat(issueForm.delay_hours) : null,
      });
      onUpdate({ ...diary, issues: [...diary.issues, row] });
      setIssueForm({
        type: "Safety",
        description: "",
        responsible_party: "",
        delay_hours: "",
      });
    } catch (err) {
      setIssueErrors({ description: err instanceof Error ? err.message : "Failed to add issue." });
    } finally {
      setAddingIssue(false);
    }
  }

  async function handleDeleteIssue(row: SiteDiaryIssue) {
    setDeletingIssueId(row.id);
    try {
      await deleteIssue(row.id);
      onUpdate({ ...diary, issues: diary.issues.filter((i) => i.id !== row.id) });
    } finally {
      setDeletingIssueId(null);
    }
  }

  function getIssueIcon(type: IssueType) {
    switch (type) {
      case "Safety":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "Delay":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "RFI":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "Instruction":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "NCR":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Issues"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={diary.issues.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Existing issues as colour-coded cards */}
          {diary.issues.length > 0 && (
            <div className="mt-3 space-y-3">
              {diary.issues.map((issue) => {
                const colors = ISSUE_COLORS[issue.type];
                return (
                  <div
                    key={issue.id}
                    className={`rounded-xl border ${colors.bg} ${colors.border} p-3`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={`flex-shrink-0 ${colors.icon}`}>
                          {getIssueIcon(issue.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                              {issue.type}
                            </span>
                            {issue.delay_hours !== null && issue.delay_hours !== undefined && (
                              <span className="text-xs text-slate-500">
                                {issue.delay_hours}h delay
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{issue.description}</p>
                          {issue.responsible_party && (
                            <p className="text-xs text-slate-500 mt-1">
                              Responsible: {issue.responsible_party}
                            </p>
                          )}
                        </div>
                      </div>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteIssue(issue)}
                          disabled={deletingIssueId === issue.id}
                          aria-label="Remove"
                          className="flex-shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add issue form */}
          {!isLocked && (
            <form onSubmit={handleAddIssue} className="mt-4 space-y-3">
              {/* Issue type selector */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Issue Type</label>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIssueForm((f) => ({ ...f, type }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        issueForm.type === type
                          ? `${ISSUE_COLORS[type].bg} ${ISSUE_COLORS[type].border} ${ISSUE_COLORS[type].text}`
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <textarea
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                  placeholder="Describe the issue..."
                />
                <FieldError msg={issueErrors.description} />
              </div>

              {/* Responsible party and delay hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={issueForm.responsible_party}
                    onChange={(e) => setIssueForm((f) => ({ ...f, responsible_party: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="Responsible party"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={issueForm.delay_hours}
                    onChange={(e) => setIssueForm((f) => ({ ...f, delay_hours: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="Delay (hours)"
                  />
                  <FieldError msg={issueErrors.delay_hours} />
                </div>
              </div>

              {/* Add button */}
              <button
                type="submit"
                disabled={addingIssue}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {addingIssue ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                )}
                Add Issue
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
