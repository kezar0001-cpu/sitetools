"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";

export type TreatmentType = "No Treatment" | "First Aid" | "Medical Treatment" | "Hospital" | "Ambulance";

export interface PersonInvolved {
  id: string;
  name: string;
  company: string;
  role: string;
  natureOfInjury: string;
  treatmentReceived: TreatmentType;
}

const TREATMENT_TYPES: TreatmentType[] = [
  "No Treatment",
  "First Aid",
  "Medical Treatment",
  "Hospital",
  "Ambulance",
];

interface PersonsInvolvedSectionProps {
  persons: PersonInvolved[];
  onUpdate: (persons: PersonInvolved[]) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function PersonsInvolvedSection({
  persons,
  onUpdate,
  isLocked,
  isOpen,
  onToggle,
}: PersonsInvolvedSectionProps) {
  const [editingPerson, setEditingPerson] = useState<PersonInvolved | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  function handleAdd() {
    setIsAdding(true);
    setEditingPerson({
      id: crypto.randomUUID(),
      name: "",
      company: "",
      role: "",
      natureOfInjury: "",
      treatmentReceived: "No Treatment",
    });
  }

  function handleEdit(person: PersonInvolved) {
    setIsAdding(false);
    setEditingPerson({ ...person });
  }

  function handleSave() {
    if (!editingPerson) return;

    if (isAdding) {
      onUpdate([...persons, editingPerson]);
    } else {
      onUpdate(persons.map((p) => (p.id === editingPerson.id ? editingPerson : p)));
    }
    setEditingPerson(null);
    setIsAdding(false);
  }

  function handleDelete(id: string) {
    onUpdate(persons.filter((p) => p.id !== id));
  }

  function handleCancel() {
    setEditingPerson(null);
    setIsAdding(false);
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Persons Involved"
          icon={
            <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={persons.length}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* List of persons */}
          {persons.length > 0 && (
            <div className="mt-4 space-y-3">
              {persons.map((person) => (
                <div
                  key={person.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{person.name}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-sm text-slate-600">{person.company}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-sm text-slate-600">{person.role}</span>
                      </div>
                      {person.natureOfInjury && (
                        <p className="text-sm text-slate-700 mt-1">
                          <span className="text-slate-500">Injury/Involvement:</span> {person.natureOfInjury}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          person.treatmentReceived === "No Treatment"
                            ? "bg-slate-100 text-slate-700"
                            : person.treatmentReceived === "First Aid"
                            ? "bg-emerald-100 text-emerald-700"
                            : person.treatmentReceived === "Medical Treatment"
                            ? "bg-amber-100 text-amber-700"
                            : person.treatmentReceived === "Hospital"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          Treatment: {person.treatmentReceived}
                        </span>
                      </div>
                    </div>
                    {!isLocked && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(person)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(person.id)}
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
          {!isLocked && editingPerson && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="font-medium text-slate-900">
                {isAdding ? "Add Person Involved" : "Edit Person"}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingPerson.name}
                    onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <input
                    type="text"
                    value={editingPerson.company}
                    onChange={(e) => setEditingPerson({ ...editingPerson, company: e.target.value })}
                    placeholder="Company name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                  <input
                    type="text"
                    value={editingPerson.role}
                    onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value })}
                    placeholder="e.g., Worker, Supervisor"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Treatment Received</label>
                  <select
                    value={editingPerson.treatmentReceived}
                    onChange={(e) => setEditingPerson({ ...editingPerson, treatmentReceived: e.target.value as TreatmentType })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    {TREATMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nature of Injury / Involvement</label>
                <textarea
                  rows={2}
                  value={editingPerson.natureOfInjury}
                  onChange={(e) => setEditingPerson({ ...editingPerson, natureOfInjury: e.target.value })}
                  placeholder="Describe the injury or how this person was involved..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
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
          {!isLocked && !editingPerson && (
            <button
              type="button"
              onClick={handleAdd}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Person Involved
            </button>
          )}
        </div>
      )}
    </div>
  );
}
