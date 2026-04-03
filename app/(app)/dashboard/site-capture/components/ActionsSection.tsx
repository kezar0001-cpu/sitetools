"use client";

import { useState, useCallback, FormEvent, useEffect } from "react";
import type { ToolboxTalkFull, ToolboxTalkAction, ToolboxActionStatus } from "@/lib/site-capture/types";
import { TOOLBOX_ACTION_STATUS_LABELS } from "@/lib/site-capture/types";
import {
  addToolboxAction,
  updateToolboxAction,
  deleteToolboxAction,
} from "@/lib/site-capture/client";
import { SectionHeader } from "./SectionHeader";

interface Props {
  diary: ToolboxTalkFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: ToolboxTalkFull) => void;
}

interface ActionFormData {
  description: string;
  assigned_to: string;
  due_date: string;
}

const STATUS_COLORS: Record<ToolboxActionStatus, string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ActionsSection({ diary, isLocked, isOpen, onToggle, onUpdate }: Props) {
  const [actions, setActions] = useState(diary.actions);
  const [isAdding, setIsAdding] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ActionFormData>({
    description: "",
    assigned_to: "",
    due_date: "",
  });

  // Sync with parent
  useEffect(() => {
    setActions(diary.actions);
  }, [diary.actions]);

  const handleAddAction = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || addingId) return;

    setAddingId("new");
    try {
      const action = await addToolboxAction(diary.id, {
        description: formData.description.trim(),
        assigned_to: formData.assigned_to.trim() || null,
        due_date: formData.due_date || null,
      });
      
      const updated = [...actions, action];
      setActions(updated);
      onUpdate({ ...diary, actions: updated });
      
      // Reset form
      setFormData({ description: "", assigned_to: "", due_date: "" });
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add action:", err);
    } finally {
      setAddingId(null);
    }
  }, [formData, diary.id, diary, actions, onUpdate, addingId]);

  const handleDeleteAction = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteToolboxAction(id);
      const updated = actions.filter((a) => a.id !== id);
      setActions(updated);
      onUpdate({ ...diary, actions: updated });
    } catch (err) {
      console.error("Failed to delete action:", err);
    } finally {
      setDeletingId(null);
    }
  }, [actions, diary, onUpdate]);

  const handleStatusChange = useCallback(async (action: ToolboxTalkAction, newStatus: ToolboxActionStatus) => {
    setUpdatingStatusId(action.id);
    try {
      const updated = await updateToolboxAction(action.id, { status: newStatus });
      const newActions = actions.map((a) => (a.id === updated.id ? updated : a));
      setActions(newActions);
      onUpdate({ ...diary, actions: newActions });
    } catch (err) {
      console.error("Failed to update action status:", err);
    } finally {
      setUpdatingStatusId(null);
    }
  }, [actions, diary, onUpdate]);

  const openCount = actions.filter((a) => a.status === "open" || a.status === "in_progress").length;
  const completedCount = actions.filter((a) => a.status === "completed").length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        title="Follow-up Actions"
        icon={
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
        open={isOpen}
        onToggle={onToggle}
        badge={actions.length > 0 ? `${completedCount}/${actions.length} done` : undefined}
      />

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Actions List */}
          {actions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`p-3 rounded-xl border ${
                    action.status === "completed"
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${action.status === "completed" ? "text-slate-500 line-through" : "text-slate-800"}`}>
                        {action.description}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {action.assigned_to && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {action.assigned_to}
                          </span>
                        )}
                        {action.due_date && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Due {new Date(action.due_date).toLocaleDateString("en-AU")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isLocked && (
                        <select
                          value={action.status}
                          onChange={(e) => handleStatusChange(action, e.target.value as ToolboxActionStatus)}
                          disabled={updatingStatusId === action.id}
                          className={`text-xs font-medium px-2 py-1 rounded-full border ${STATUS_COLORS[action.status]} focus:outline-none focus:ring-2 focus:ring-purple-400`}
                        >
                          <option value="open">{TOOLBOX_ACTION_STATUS_LABELS.open}</option>
                          <option value="in_progress">{TOOLBOX_ACTION_STATUS_LABELS.in_progress}</option>
                          <option value="completed">{TOOLBOX_ACTION_STATUS_LABELS.completed}</option>
                          <option value="cancelled">{TOOLBOX_ACTION_STATUS_LABELS.cancelled}</option>
                        </select>
                      )}
                      {isLocked && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${STATUS_COLORS[action.status]}`}>
                          {TOOLBOX_ACTION_STATUS_LABELS[action.status]}
                        </span>
                      )}
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAction(action.id)}
                          disabled={deletingId === action.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 text-center">
              <p className="text-sm text-slate-500">No follow-up actions</p>
            </div>
          )}

          {/* Add Action Form */}
          {!isLocked && (
            <div className="mt-4">
              {!isAdding ? (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Action
                </button>
              ) : (
                <form onSubmit={handleAddAction} className="space-y-3 p-3 rounded-xl bg-slate-50">
                  <div>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Action description *"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData((f) => ({ ...f, assigned_to: e.target.value }))}
                      placeholder="Assigned to"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData((f) => ({ ...f, due_date: e.target.value }))}
                      placeholder="Due date"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingId === "new"}
                      className="flex-1 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-60"
                    >
                      {addingId === "new" ? "Adding..." : "Add"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
