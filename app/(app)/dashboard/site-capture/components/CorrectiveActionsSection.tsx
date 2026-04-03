"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";

export type CorrectiveActionStatus = "Open" | "Closed";

export interface CorrectiveAction {
  id: string;
  description: string;
  responsiblePerson: string;
  dueDate: string;
  status: CorrectiveActionStatus;
}

interface CorrectiveActionsSectionProps {
  actions: CorrectiveAction[];
  onUpdate: (actions: CorrectiveAction[]) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const STATUS_COLORS: Record<CorrectiveActionStatus, { bg: string; text: string; border: string }> = {
  Open: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Closed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

export function CorrectiveActionsSection({
  actions,
  onUpdate,
  isLocked,
  isOpen,
  onToggle,
}: CorrectiveActionsSectionProps) {
  const [editingAction, setEditingAction] = useState<CorrectiveAction | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const openCount = actions.filter((a) => a.status === "Open").length;
  const closedCount = actions.filter((a) => a.status === "Closed").length;

  function handleAdd() {
    setIsAdding(true);
    setEditingAction({
      id: crypto.randomUUID(),
      description: "",
      responsiblePerson: "",
      dueDate: new Date().toISOString().slice(0, 10),
      status: "Open",
    });
  }

  function handleEdit(action: CorrectiveAction) {
    setIsAdding(false);
    setEditingAction({ ...action });
  }

  function handleSave() {
    if (!editingAction) return;

    if (isAdding) {
      onUpdate([...actions, editingAction]);
    } else {
      onUpdate(actions.map((a) => (a.id === editingAction.id ? editingAction : a)));
    }
    setEditingAction(null);
    setIsAdding(false);
  }

  function handleDelete(id: string) {
    onUpdate(actions.filter((a) => a.id !== id));
  }

  function handleCancel() {
    setEditingAction(null);
    setIsAdding(false);
  }

  function toggleStatus(id: string) {
    if (isLocked) return;
    onUpdate(
      actions.map((a) =>
        a.id === id ? { ...a, status: a.status === "Open" ? "Closed" : "Open" } : a
      )
    );
  }

  const badgeText = closedCount > 0 ? `${closedCount}/${actions.length}` : actions.length > 0 ? `${actions.length}` : undefined;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Corrective Actions"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={badgeText}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Status Summary */}
          {actions.length > 0 && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-slate-600">
                <span className="font-semibold text-amber-700">{openCount}</span> open
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                <span className="font-semibold text-emerald-700">{closedCount}</span> closed
              </span>
            </div>
          )}

          {/* Actions List */}
          {actions.length > 0 && (
            <div className="mt-3 space-y-3">
              {actions.map((action) => {
                const colors = STATUS_COLORS[action.status];
                return (
                  <div
                    key={action.id}
                    className={`rounded-xl border ${colors.bg} ${colors.border} p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleStatus(action.id)}
                            disabled={isLocked}
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              action.status === "Open"
                                ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                                : "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                            } ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {action.status}
                          </button>
                          <span className="text-xs text-slate-500">
                            Due: {new Date(action.dueDate).toLocaleDateString("en-AU")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 mt-2">{action.description}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Responsible: {action.responsiblePerson}
                        </p>
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(action)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(action.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add/Edit Form */}
          {!isLocked && editingAction && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="font-medium text-slate-900">
                {isAdding ? "Add Corrective Action" : "Edit Action"}
              </h4>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Action Description</label>
                <textarea
                  rows={2}
                  value={editingAction.description}
                  onChange={(e) => setEditingAction({ ...editingAction, description: e.target.value })}
                  placeholder="Describe the corrective action required..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Responsible Person</label>
                  <input
                    type="text"
                    value={editingAction.responsiblePerson}
                    onChange={(e) => setEditingAction({ ...editingAction, responsiblePerson: e.target.value })}
                    placeholder="Name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingAction.dueDate}
                    onChange={(e) => setEditingAction({ ...editingAction, dueDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={editingAction.status}
                  onChange={(e) => setEditingAction({ ...editingAction, status: e.target.value as CorrectiveActionStatus })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!isLocked && !editingAction && (
            <button
              type="button"
              onClick={handleAdd}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Corrective Action
            </button>
          )}
        </div>
      )}
    </div>
  );
}
