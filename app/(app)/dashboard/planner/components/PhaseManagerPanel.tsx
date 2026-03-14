"use client";

import React, { useEffect, useRef, useState } from "react";
import { PlanPhase, PlanTask } from "@/lib/planner/types";

// ── Preset colour palette (construction-appropriate) ──
const PHASE_COLORS = [
  { label: "Red",     hex: "#ef4444" },
  { label: "Orange",  hex: "#f97316" },
  { label: "Amber",   hex: "#f59e0b" },
  { label: "Yellow",  hex: "#eab308" },
  { label: "Lime",    hex: "#84cc16" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Teal",    hex: "#14b8a6" },
  { label: "Cyan",    hex: "#06b6d4" },
  { label: "Blue",    hex: "#3b82f6" },
  { label: "Indigo",  hex: "#6366f1" },
  { label: "Purple",  hex: "#a855f7" },
  { label: "Slate",   hex: "#64748b" },
];

interface Props {
  open: boolean;
  phases: PlanPhase[];
  tasks: PlanTask[];
  saving: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (phaseId: string, patch: { name?: string; color?: string | null }) => Promise<void>;
  onDelete: (phase: PlanPhase) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
}

export function PhaseManagerPanel({
  open,
  phases,
  tasks,
  saving,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  // ── New phase form state ──
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PHASE_COLORS[8].hex); // Blue default
  const [adding, setAdding] = useState(false);

  // ── Inline edit state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // ── Drag state ──
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<PlanPhase[]>(phases);

  // Keep local order in sync when phases prop changes (after save)
  useEffect(() => {
    setLocalOrder(phases);
  }, [phases]);

  // ── Helpers ──
  const taskCountForPhase = (phaseId: string) =>
    tasks.filter((t) => t.phase_id === phaseId).length;

  // ── New phase submit ──
  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onCreate(trimmed, newColor);
      setNewName("");
      setNewColor(PHASE_COLORS[8].hex);
    } finally {
      setAdding(false);
    }
  };

  // ── Inline edit commit ──
  const startEdit = (phase: PlanPhase) => {
    setEditingId(phase.id);
    setEditName(phase.name);
    setEditColor(phase.color ?? PHASE_COLORS[8].hex);
  };

  const commitEdit = async (phaseId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) { cancelEdit(); return; }
    await onUpdate(phaseId, { name: trimmed, color: editColor });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleEditKeyDown = (e: React.KeyboardEvent, phaseId: string) => {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(phaseId); }
    if (e.key === "Escape") cancelEdit();
  };

  // ── Delete ──
  const handleDelete = async (phase: PlanPhase) => {
    const count = taskCountForPhase(phase.id);
    const msg = count > 0
      ? `Delete phase "${phase.name}"?\n\n${count} task${count !== 1 ? "s" : ""} will become unphased. This cannot be undone.`
      : `Delete phase "${phase.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    await onDelete(phase);
  };

  // ── Drag-to-reorder ──
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (dropIndex: number) => {
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    const next = [...localOrder];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(dropIndex, 0, moved);
    setLocalOrder(next);
    setDragOverIndex(null);
    dragIndexRef.current = null;
    await onReorder(next.map((p) => p.id));
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  // ── Move by button (accessible alternative to drag) ──
  const movePhase = async (index: number, direction: -1 | 1) => {
    const next = [...localOrder];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setLocalOrder(next);
    await onReorder(next.map((p) => p.id));
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full z-40 flex flex-col bg-white shadow-2xl border-l border-slate-200 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">Phase Manager</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Organise tasks into phases / stages
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Info banner */}
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex-shrink-0">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Tip:</span> Drag rows to reorder phases. Tasks in deleted phases become unphased.
          </p>
        </div>

        {/* Phase list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {localOrder.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm text-slate-500">No phases yet.</p>
              <p className="text-xs text-slate-400 mt-1">Add your first phase below.</p>
            </div>
          )}

          {localOrder.map((phase, index) => {
            const count = taskCountForPhase(phase.id);
            const isEditing = editingId === phase.id;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={phase.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`group relative rounded-xl border transition-all select-none ${
                  isDragOver
                    ? "border-amber-400 bg-amber-50 shadow-md scale-[1.01]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                } ${saving ? "opacity-60" : ""}`}
              >
                {isEditing ? (
                  /* ── Edit mode ── */
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Phase Name</label>
                      <input
                        autoFocus
                        className="w-full border border-amber-400 rounded-lg px-3 py-2 text-sm bg-amber-50 outline-none focus:ring-2 focus:ring-amber-200"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, phase.id)}
                        placeholder="Phase name…"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Colour</label>
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => commitEdit(phase.id)}
                        disabled={saving}
                        className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display mode ── */
                  <div className="flex items-center gap-3 px-3 py-3">
                    {/* Drag handle */}
                    <span
                      className="text-slate-300 cursor-grab active:cursor-grabbing text-lg leading-none flex-shrink-0"
                      title="Drag to reorder"
                    >
                      ⠿
                    </span>

                    {/* Color swatch */}
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white ring-offset-1 shadow-sm"
                      style={{ backgroundColor: phase.color ?? "#64748b" }}
                    />

                    {/* Name + count */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{phase.name}</p>
                      <p className="text-xs text-slate-400">
                        {count} task{count !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Reorder arrows (accessible alternative) */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => movePhase(index, -1)}
                        disabled={index === 0 || saving}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => movePhase(index, 1)}
                        disabled={index === localOrder.length - 1 || saving}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => startEdit(phase)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      title="Edit phase"
                    >
                      ✎
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(phase)}
                      disabled={saving}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20"
                      title="Delete phase"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add phase form */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Add Phase</p>

          <div className="space-y-3">
            <input
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none transition-colors"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Phase name (e.g. Mobilisation)"
              disabled={adding || saving}
            />

            <ColorPicker value={newColor} onChange={setNewColor} />

            <button
              onClick={handleAdd}
              disabled={!newName.trim() || adding || saving}
              className="w-full px-4 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {adding ? "Adding…" : "+ Add Phase"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Colour picker sub-component ──
function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {PHASE_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          onClick={() => onChange(c.hex)}
          className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
            value === c.hex ? "ring-2 ring-offset-2 ring-slate-500 scale-110" : ""
          }`}
          style={{ backgroundColor: c.hex }}
          title={c.label}
        />
      ))}
      {/* Custom hex fallback */}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border border-slate-300 p-0"
        title="Custom colour"
      />
    </div>
  );
}
