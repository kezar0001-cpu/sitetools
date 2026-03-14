"use client";

import { FormEvent, useCallback, useState } from "react";
import {
  addEquipment,
  addLabor,
  approveDiary,
  deleteEquipment,
  deleteLabor,
  rejectDiary,
  submitDiary,
  updateDiary,
} from "@/lib/diary/client";
import {
  WEATHER_CONDITIONS,
  WEATHER_CONDITION_ICONS,
  WEATHER_CONDITION_LABELS,
} from "@/lib/diary/types";
import { validateEquipment, validateLabor } from "@/lib/diary/validation";
import type {
  SiteDiaryEquipment,
  SiteDiaryFull,
  SiteDiaryLabor,
  SiteDiaryPhoto,
  WeatherCondition,
} from "@/lib/diary/types";
import type { CompanyRole } from "@/lib/workspace/types";
import PhotoUploader from "./PhotoUploader";

interface Props {
  diary: SiteDiaryFull;
  onUpdate?: (updated: SiteDiaryFull) => void;
  userRole?: CompanyRole | null;
  userId?: string | null;
}

type Section = "weather" | "labor" | "equipment" | "photos" | "notes";

// ─── Small helpers ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  icon,
  open,
  onToggle,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-1 py-3 text-left"
    >
      <span className="flex items-center gap-2 font-semibold text-slate-700">
        {icon}
        {title}
        {badge != null && badge > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            {badge}
          </span>
        )}
      </span>
      <svg
        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DiaryEntryForm({ diary: initialDiary, onUpdate, userRole, userId }: Props) {
  const [diary, setDiary] = useState<SiteDiaryFull>(initialDiary);
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["weather", "labor"] as Section[])
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Derived state
  const isLocked = diary.status === "submitted" || diary.status === "approved";
  const isApproved = diary.status === "approved";
  const isRejected = diary.status === "rejected";
  const canSubmit = diary.status === "draft" || diary.status === "rejected";
  const canReview =
    diary.status === "submitted" &&
    (userRole === "owner" || userRole === "admin" || userRole === "manager");

  // Auto-save helper
  async function autosave(field: string, updater: () => Promise<SiteDiaryFull>) {
    setSaving((s) => ({ ...s, [field]: true }));
    try {
      const updated = await updater();
      setDiary(updated);
      onUpdate?.(updated);
    } catch (err) {
      console.error("[DiaryEntryForm] autosave error:", err);
    } finally {
      setSaving((s) => ({ ...s, [field]: false }));
    }
  }

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  // ── Weather ──────────────────────────────────────────────────────────────

  function handleWeatherCondition(conditions: WeatherCondition) {
    void autosave("weather", async () => {
      const updated = await updateDiary(diary.id, { weather: { ...diary.weather, conditions } });
      return { ...diary, ...updated };
    });
  }

  function handleTempBlur(field: "temp_min" | "temp_max", raw: string) {
    const value = raw === "" ? null : Number(raw);
    if (raw !== "" && Number.isNaN(value)) return;
    void autosave(`weather.${field}`, async () => {
      const updated = await updateDiary(diary.id, { weather: { ...diary.weather, [field]: value } });
      return { ...diary, ...updated };
    });
  }

  function handleWindBlur(wind: string) {
    void autosave("weather.wind", async () => {
      const updated = await updateDiary(diary.id, {
        weather: { ...diary.weather, wind: wind.trim() || null },
      });
      return { ...diary, ...updated };
    });
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  function handleNotesBlur(notes: string) {
    void autosave("notes", async () => {
      const updated = await updateDiary(diary.id, { notes: notes.trim() || null });
      return { ...diary, ...updated };
    });
  }

  // ── Labor ────────────────────────────────────────────────────────────────

  const [laborForm, setLaborForm] = useState({ trade_or_company: "", worker_count: "", hours_worked: "" });
  const [laborErrors, setLaborErrors] = useState<Record<string, string>>({});
  const [addingLabor, setAddingLabor] = useState(false);
  const [deletingLaborId, setDeletingLaborId] = useState<string | null>(null);

  async function handleAddLabor(e: FormEvent) {
    e.preventDefault();
    const payload = {
      trade_or_company: laborForm.trade_or_company.trim(),
      worker_count: parseInt(laborForm.worker_count, 10),
      hours_worked: parseFloat(laborForm.hours_worked),
    };
    const result = validateLabor(payload);
    if (!result.valid) { setLaborErrors(result.errors); return; }
    setLaborErrors({});
    setAddingLabor(true);
    try {
      const row = await addLabor(diary.id, payload);
      setDiary((d) => ({ ...d, labor: [...d.labor, row] }));
      setLaborForm({ trade_or_company: "", worker_count: "", hours_worked: "" });
    } catch (err) {
      setLaborErrors({ trade_or_company: err instanceof Error ? err.message : "Failed to add." });
    } finally {
      setAddingLabor(false);
    }
  }

  async function handleDeleteLabor(row: SiteDiaryLabor) {
    setDeletingLaborId(row.id);
    try {
      await deleteLabor(row.id);
      setDiary((d) => ({ ...d, labor: d.labor.filter((l) => l.id !== row.id) }));
    } finally {
      setDeletingLaborId(null);
    }
  }

  // ── Equipment ────────────────────────────────────────────────────────────

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
      setDiary((d) => ({ ...d, equipment: [...d.equipment, row] }));
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
      setDiary((d) => ({ ...d, equipment: d.equipment.filter((eq) => eq.id !== row.id) }));
    } finally {
      setDeletingEquipId(null);
    }
  }

  // ── Photos ───────────────────────────────────────────────────────────────

  const handlePhotosChange = useCallback((photos: SiteDiaryPhoto[]) => {
    setDiary((d) => ({ ...d, photos }));
  }, []);

  // ── Submit (author) ──────────────────────────────────────────────────────

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await submitDiary(diary.id);
      const next = { ...diary, ...updated };
      setDiary(next);
      onUpdate?.(next);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Approve / Reject (admin) ─────────────────────────────────────────────

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function handleApprove() {
    setApproving(true);
    setReviewError(null);
    try {
      const updated = await approveDiary(diary.id);
      const next = { ...diary, ...updated };
      setDiary(next);
      onUpdate?.(next);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    setReviewError(null);
    try {
      const updated = await rejectDiary(diary.id, rejectNote);
      const next = { ...diary, ...updated };
      setDiary(next);
      onUpdate?.(next);
      setShowRejectForm(false);
      setRejectNote("");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to reject.");
    } finally {
      setRejecting(false);
    }
  }

  const totalWorkers = diary.labor.reduce((sum, l) => sum + l.worker_count, 0);

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1">
      {/* ── Rejection notice (shown to author when diary was rejected) ── */}
      {isRejected && diary.rejection_note && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Changes requested</p>
          <p className="text-sm text-red-600 whitespace-pre-wrap">{diary.rejection_note}</p>
          <p className="mt-2 text-xs text-red-500">
            Address the feedback above, then resubmit for review.
          </p>
        </div>
      )}

      {/* ── Weather ── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader
            title="Weather"
            icon={<span className="text-lg">🌤️</span>}
            open={openSections.has("weather")}
            onToggle={() => toggleSection("weather")}
          />
        </div>
        {openSections.has("weather") && (
          <div className="px-4 pb-5 space-y-4 border-t border-slate-100">
            {/* Condition picker */}
            <div className="pt-4">
              <p className="text-sm font-medium text-slate-600 mb-2">Conditions</p>
              <div className="flex flex-wrap gap-2">
                {WEATHER_CONDITIONS.map((cond) => {
                  const active = diary.weather?.conditions === cond;
                  return (
                    <button
                      key={cond}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleWeatherCondition(cond)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                        active
                          ? "bg-amber-400 border-amber-400 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                      } ${saving["weather"] ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <span>{WEATHER_CONDITION_ICONS[cond]}</span>
                      <span>{WEATHER_CONDITION_LABELS[cond]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temp + Wind */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Min °C</label>
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={isLocked}
                  defaultValue={diary.weather?.temp_min ?? ""}
                  onBlur={(e) => handleTempBlur("temp_min", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  placeholder="e.g. 14"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Max °C</label>
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={isLocked}
                  defaultValue={diary.weather?.temp_max ?? ""}
                  onBlur={(e) => handleTempBlur("temp_max", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  placeholder="e.g. 28"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Wind</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={diary.weather?.wind ?? ""}
                onBlur={(e) => handleWindBlur(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                placeholder="e.g. 15–20 km/h NW"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Labor ── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader
            title="Labour"
            icon={
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-4M9 20H4v-2a4 4 0 015-4m4-4a4 4 0 110-8 4 4 0 010 8zm6 4a2 2 0 11-4 0 2 2 0 014 0zM5 16a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            open={openSections.has("labor")}
            onToggle={() => toggleSection("labor")}
            badge={diary.labor.length}
          />
        </div>
        {openSections.has("labor") && (
          <div className="px-4 pb-5 border-t border-slate-100">
            {/* Summary */}
            {totalWorkers > 0 && (
              <p className="pt-3 text-sm text-slate-500">
                Total on site: <span className="font-semibold text-slate-800">{totalWorkers} workers</span>
              </p>
            )}

            {/* Existing rows */}
            {diary.labor.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100">
                {diary.labor.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{row.trade_or_company}</p>
                      <p className="text-xs text-slate-500">
                        {row.worker_count} worker{row.worker_count !== 1 ? "s" : ""} · {row.hours_worked}h
                      </p>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLabor(row)}
                        disabled={deletingLaborId === row.id}
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
              <form onSubmit={handleAddLabor} className="mt-4 space-y-3">
                <div>
                  <input
                    type="text"
                    value={laborForm.trade_or_company}
                    onChange={(e) => setLaborForm((f) => ({ ...f, trade_or_company: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Trade or company (e.g. Concrete crew)"
                  />
                  <FieldError msg={laborErrors.trade_or_company} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={laborForm.worker_count}
                      onChange={(e) => setLaborForm((f) => ({ ...f, worker_count: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      placeholder="Workers"
                    />
                    <FieldError msg={laborErrors.worker_count} />
                  </div>
                  <div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0.1}
                      step={0.5}
                      value={laborForm.hours_worked}
                      onChange={(e) => setLaborForm((f) => ({ ...f, hours_worked: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      placeholder="Hours"
                    />
                    <FieldError msg={laborErrors.hours_worked} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addingLabor}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {addingLabor ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  Add Labour
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Equipment ── */}
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
            open={openSections.has("equipment")}
            onToggle={() => toggleSection("equipment")}
            badge={diary.equipment.length}
          />
        </div>
        {openSections.has("equipment") && (
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

      {/* ── Photos ── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader
            title="Photos"
            icon={
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            open={openSections.has("photos")}
            onToggle={() => toggleSection("photos")}
            badge={diary.photos.length}
          />
        </div>
        {openSections.has("photos") && (
          <div className="px-4 pb-5 border-t border-slate-100 pt-4">
            <PhotoUploader
              diaryId={diary.id}
              initialPhotos={diary.photos}
              onChange={handlePhotosChange}
              disabled={isLocked}
            />
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4">
          <SectionHeader
            title="Notes"
            icon={
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
            open={openSections.has("notes")}
            onToggle={() => toggleSection("notes")}
          />
        </div>
        {openSections.has("notes") && (
          <div className="px-4 pb-5 border-t border-slate-100 pt-4">
            <textarea
              rows={5}
              disabled={isLocked}
              defaultValue={diary.notes ?? ""}
              onBlur={(e) => handleNotesBlur(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none disabled:opacity-50"
              placeholder="Site events, issues, instructions, visitors…"
            />
            {saving["notes"] && (
              <p className="mt-1 text-xs text-slate-400">Saving…</p>
            )}
          </div>
        )}
      </div>

      {/* ── Submit bar (author) ── */}
      {canSubmit && (
        <div className="space-y-2">
          {submitError && (
            <p className="text-sm text-red-600 text-center">{submitError}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white text-base font-bold shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {submitting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isRejected ? "Resubmit for Review" : "Submit for Review"}
          </button>
        </div>
      )}

      {/* ── Pending review indicator (submitted, not an admin reviewer) ── */}
      {diary.status === "submitted" && !canReview && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Awaiting Review
        </div>
      )}

      {/* ── Approve / Reject panel (admin, when diary is submitted) ── */}
      {canReview && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Review this diary</p>

          {reviewError && (
            <p className="text-sm text-red-600">{reviewError}</p>
          )}

          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {approving ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={approving || rejecting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Request Changes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
                placeholder="Describe what needs to be changed…"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowRejectForm(false); setRejectNote(""); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {rejecting ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : null}
                  Send Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Approved indicator ── */}
      {isApproved && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Diary Approved
        </div>
      )}
    </div>
  );
}
