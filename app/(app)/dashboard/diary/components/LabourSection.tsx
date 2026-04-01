"use client";

import { FormEvent, useState, useEffect } from "react";
import {
  addLabor,
  deleteLabor,
  getSiteSignLabor,
  type SiteSignLaborEntry,
} from "@/lib/diary/client";
import { validateLabor } from "@/lib/diary/validation";
import type { SiteDiaryFull, SiteDiaryLabor } from "@/lib/diary/types";
import { SectionHeader } from "./SectionHeader";

interface FieldErrorProps {
  msg?: string;
}

function FieldError({ msg }: FieldErrorProps) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

interface LabourSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: SiteDiaryFull) => void;
}

export function LabourSection({
  diary,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: LabourSectionProps) {
  const [laborForm, setLaborForm] = useState({ trade_or_company: "", worker_count: "", hours_worked: "" });
  const [laborErrors, setLaborErrors] = useState<Record<string, string>>({});
  const [addingLabor, setAddingLabor] = useState(false);
  const [deletingLaborId, setDeletingLaborId] = useState<string | null>(null);

  // SiteSign Labor Import
  const [siteSignLabor, setSiteSignLabor] = useState<SiteSignLaborEntry[]>([]);
  const [loadingSiteSign, setLoadingSiteSign] = useState(false);
  const [siteSignError, setSiteSignError] = useState<string | null>(null);
  const [showSiteSignDetail, setShowSiteSignDetail] = useState<string | null>(null);

  // Load SiteSign labor on mount if site_id exists
  useEffect(() => {
    if (!diary.site_id) return;
    setLoadingSiteSign(true);
    setSiteSignError(null);
    getSiteSignLabor(diary.site_id, diary.date)
      .then(setSiteSignLabor)
      .catch((err) => {
        console.warn("[LabourSection] Failed to load SiteSign labor:", err);
        setSiteSignError("Could not load SiteSign records");
      })
      .finally(() => setLoadingSiteSign(false));
  }, [diary.site_id, diary.date]);

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
      onUpdate({ ...diary, labor: [...diary.labor, row] });
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
      onUpdate({ ...diary, labor: diary.labor.filter((l) => l.id !== row.id) });
    } finally {
      setDeletingLaborId(null);
    }
  }

  const totalWorkers = diary.labor.reduce((sum, l) => sum + l.worker_count, 0);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Labour"
          icon={
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-4M9 20H4v-2a4 4 0 015-4m4-4a4 4 0 110-8 4 4 0 010 8zm6 4a2 2 0 11-4 0 2 2 0 014 0zM5 16a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={diary.labor.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Summary */}
          {totalWorkers > 0 && (
            <p className="pt-3 text-sm text-slate-500">
              Total on site: <span className="font-semibold text-slate-800">{totalWorkers} workers</span>
            </p>
          )}

          {/* SiteSign Import Section */}
          {!isLocked && diary.site_id && (
            <div className="mt-4">
              {loadingSiteSign ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading SiteSign records...
                </div>
              ) : siteSignError ? (
                <p className="text-xs text-red-600">{siteSignError}</p>
              ) : siteSignLabor.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    From SiteSign ({siteSignLabor.length} companies)
                  </p>
                  {siteSignLabor.map((entry) => {
                    const alreadyAdded = diary.labor.some(
                      (l) => l.trade_or_company.toLowerCase() === entry.company_name.toLowerCase()
                    );
                    const avgHours = entry.worker_count > 0
                      ? Math.round((entry.total_hours / entry.worker_count) * 10) / 10
                      : 0;
                    return (
                      <div key={entry.company_name} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{entry.company_name}</p>
                            <p className="text-xs text-slate-500">
                              {entry.worker_count} workers · {entry.total_hours}h total
                            </p>
                          </div>
                          {alreadyAdded ? (
                            <span className="text-xs text-emerald-600 font-medium">Added</span>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const row = await addLabor(diary.id, {
                                    trade_or_company: entry.company_name,
                                    worker_count: entry.worker_count,
                                    hours_worked: avgHours,
                                  });
                                  onUpdate({ ...diary, labor: [...diary.labor, row] });
                                } catch (err) {
                                  console.error("Failed to import from SiteSign:", err);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              Import
                            </button>
                          )}
                        </div>
                        {showSiteSignDetail === entry.company_name && (
                          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                            {entry.workers.map((w, i) => (
                              <div key={i} className="text-xs text-slate-500 flex justify-between">
                                <span>{w.full_name}</span>
                                <span>{w.hours}h</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowSiteSignDetail(
                            showSiteSignDetail === entry.company_name ? null : entry.company_name
                          )}
                          className="mt-2 text-xs text-slate-400 hover:text-slate-600"
                        >
                          {showSiteSignDetail === entry.company_name ? "Hide details" : "Show details"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No SiteSign records for this date</p>
              )}
            </div>
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
  );
}
