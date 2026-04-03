"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";

export interface Witness {
  id: string;
  name: string;
  company: string;
  contactNumber: string;
  statement: string;
}

interface WitnessesSectionProps {
  witnesses: Witness[];
  onUpdate: (witnesses: Witness[]) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function WitnessesSection({
  witnesses,
  onUpdate,
  isLocked,
  isOpen,
  onToggle,
}: WitnessesSectionProps) {
  const [editingWitness, setEditingWitness] = useState<Witness | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  function handleAdd() {
    setIsAdding(true);
    setEditingWitness({
      id: crypto.randomUUID(),
      name: "",
      company: "",
      contactNumber: "",
      statement: "",
    });
  }

  function handleEdit(witness: Witness) {
    setIsAdding(false);
    setEditingWitness({ ...witness });
  }

  function handleSave() {
    if (!editingWitness) return;

    if (isAdding) {
      onUpdate([...witnesses, editingWitness]);
    } else {
      onUpdate(witnesses.map((w) => (w.id === editingWitness.id ? editingWitness : w)));
    }
    setEditingWitness(null);
    setIsAdding(false);
  }

  function handleDelete(id: string) {
    onUpdate(witnesses.filter((w) => w.id !== id));
  }

  function handleCancel() {
    setEditingWitness(null);
    setIsAdding(false);
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Witnesses"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={witnesses.length}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* List of witnesses */}
          {witnesses.length > 0 && (
            <div className="mt-4 space-y-3">
              {witnesses.map((witness) => (
                <div
                  key={witness.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{witness.name}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-sm text-slate-600">{witness.company}</span>
                      </div>
                      {witness.contactNumber && (
                        <p className="text-sm text-slate-700 mt-1">
                          <span className="text-slate-500">Contact:</span> {witness.contactNumber}
                        </p>
                      )}
                      {witness.statement && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500 uppercase">Statement</p>
                          <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{witness.statement}</p>
                        </div>
                      )}
                    </div>
                    {!isLocked && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(witness)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(witness.id)}
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
              ))}
            </div>
          )}

          {/* Add/Edit Form */}
          {!isLocked && editingWitness && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="font-medium text-slate-900">
                {isAdding ? "Add Witness" : "Edit Witness"}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingWitness.name}
                    onChange={(e) => setEditingWitness({ ...editingWitness, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={editingWitness.company}
                    onChange={(e) => setEditingWitness({ ...editingWitness, company: e.target.value })}
                    placeholder="Company name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Number</label>
                <input
                  type="tel"
                  value={editingWitness.contactNumber}
                  onChange={(e) => setEditingWitness({ ...editingWitness, contactNumber: e.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Statement</label>
                <textarea
                  rows={3}
                  value={editingWitness.statement}
                  onChange={(e) => setEditingWitness({ ...editingWitness, statement: e.target.value })}
                  placeholder="Witness statement..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
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
          {!isLocked && !editingWitness && (
            <button
              type="button"
              onClick={handleAdd}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Witness
            </button>
          )}
        </div>
      )}
    </div>
  );
}
