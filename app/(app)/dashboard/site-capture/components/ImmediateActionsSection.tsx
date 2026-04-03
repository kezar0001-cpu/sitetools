"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";

export interface ImmediateAction {
  id: string;
  description: string;
  takenBy: string;
}

interface ImmediateActionsSectionProps {
  actions: ImmediateAction[];
  onUpdate: (actions: ImmediateAction[]) => void;
  areaMadeSafe: boolean | null;
  workStopped: boolean | null;
  onSafetyUpdate: (updates: { areaMadeSafe?: boolean | null; workStopped?: boolean | null }) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function ImmediateActionsSection({
  actions,
  onUpdate,
  areaMadeSafe,
  workStopped,
  onSafetyUpdate,
  isLocked,
  isOpen,
  onToggle,
}: ImmediateActionsSectionProps) {
  const [editingAction, setEditingAction] = useState<ImmediateAction | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  function handleAdd() {
    setIsAdding(true);
    setEditingAction({
      id: crypto.randomUUID(),
      description: "",
      takenBy: "",
    });
  }

  function handleEdit(action: ImmediateAction) {
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

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Immediate Actions"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={actions.length}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4 space-y-4">
            {/* Safety Questions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Was the area made safe?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => !isLocked && onSafetyUpdate({ areaMadeSafe: true })}
                    disabled={isLocked}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      areaMadeSafe === true
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => !isLocked && onSafetyUpdate({ areaMadeSafe: false })}
                    disabled={isLocked}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      areaMadeSafe === false
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Was work stopped?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => !isLocked && onSafetyUpdate({ workStopped: true })}
                    disabled={isLocked}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      workStopped === true
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => !isLocked && onSafetyUpdate({ workStopped: false })}
                    disabled={isLocked}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      workStopped === false
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            {/* Actions List */}
            {actions.length > 0 && (
              <div className="space-y-2">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{action.description}</p>
                        <p className="text-xs text-slate-500 mt-1">Taken by: {action.takenBy}</p>
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(action)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(action.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Form */}
            {!isLocked && editingAction && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h4 className="font-medium text-slate-900">
                  {isAdding ? "Add Immediate Action" : "Edit Action"}
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editingAction.description}
                    onChange={(e) => setEditingAction({ ...editingAction, description: e.target.value })}
                    placeholder="Describe the action taken..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Taken By</label>
                  <input
                    type="text"
                    value={editingAction.takenBy}
                    onChange={(e) => setEditingAction({ ...editingAction, takenBy: e.target.value })}
                    placeholder="Name of person who took action"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Immediate Action
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
