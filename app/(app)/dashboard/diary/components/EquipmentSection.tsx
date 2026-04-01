"use client";

import { FormEvent, useState } from "react";
import { addEquipment, deleteEquipment } from "@/lib/diary/client";
import { validateEquipment } from "@/lib/diary/validation";
import type { SiteDiaryFull, SiteDiaryEquipment } from "@/lib/diary/types";
import { SectionHeader } from "./SectionHeader";

interface FieldErrorProps {
  msg?: string;
}

function FieldError({ msg }: FieldErrorProps) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

interface EquipmentSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
}

export function EquipmentSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: EquipmentSectionProps) {
  const [equipForm, setEquipForm] = useState({ equipment_type: "", quantity: "", hours_used: "" });
  const [equipErrors, setEquipErrors] = useState<Record<string, string>>({});
  const [addingEquip, setAddingEquip] = useState(false);
  const [deletingEquipId, setDeletingEquipId] = useState<string | null>(null);

  async function handleAddEquipment(e: FormEvent) {
    e.preventDefault();
    const payload = {
      equipment_type: equipForm.equipment_type.trim(),
      quantity: parseInt(equipForm.quantity, 10),
      hours_used: parseFloat(equipForm.hours_used),
    };
    const result = validateEquipment(payload);
    if (!result.valid) { setEquipErrors(result.errors); return; }
    setEquipErrors({});
    setAddingEquip(true);
    try {
      const row = await addEquipment(diary.id, payload);
      onUpdate({ ...diary, equipment: [...diary.equipment, row] });
      setEquipForm({ equipment_type: "", quantity: "", hours_used: "" });
    } catch (err) {
      setEquipErrors({ equipment_type: err instanceof Error ? err.message : "Failed to add." });
    } finally {
      setAddingEquip(false);
    }
  }

  async function handleDeleteEquipment(row: SiteDiaryEquipment) {
    setDeletingEquipId(row.id);
    try {
      await deleteEquipment(row.id);
      onUpdate({ ...diary, equipment: diary.equipment.filter((eq) => eq.id !== row.id) });
    } finally {
      setDeletingEquipId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Plant & Equipment"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={diary.equipment.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Existing rows */}
          {diary.equipment.length > 0 && (
            <div className="mt-3 divide-y divide-slate-100">
              {diary.equipment.map((row) => (
                <div key={row.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{row.equipment_type}</p>
                    <p className="text-xs text-slate-500">
                      Qty {row.quantity} · {row.hours_used}h
                    </p>
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEquipment(row)}
                      disabled={deletingEquipId === row.id}
                      aria-label="Remove"
                      className="flex-shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick-add inline form */}
          {!isLocked && (
            <form onSubmit={handleAddEquipment} className="mt-4 space-y-3">
              <div>
                <input
                  type="text"
                  value={equipForm.equipment_type}
                  onChange={(e) => setEquipForm((f) => ({ ...f, equipment_type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="Equipment type (e.g. 30t Excavator)"
                />
                <FieldError msg={equipErrors.equipment_type} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={equipForm.quantity}
                    onChange={(e) => setEquipForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="Qty"
                  />
                  <FieldError msg={equipErrors.quantity} />
                </div>
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.1}
                    step={0.5}
                    value={equipForm.hours_used}
                    onChange={(e) => setEquipForm((f) => ({ ...f, hours_used: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="Hours"
                  />
                  <FieldError msg={equipErrors.hours_used} />
                </div>
              </div>
              <button
                type="submit"
                disabled={addingEquip}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {addingEquip ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                )}
                Add Equipment
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
