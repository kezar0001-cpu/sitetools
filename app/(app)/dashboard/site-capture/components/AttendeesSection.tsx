"use client";

import { useState, useCallback, FormEvent, useEffect } from "react";
import type { ToolboxTalkFull, ToolboxTalkAttendee } from "@/lib/site-capture/types";
import {
  addToolboxAttendee,
  updateToolboxAttendee,
  deleteToolboxAttendee,
  findDailyDiaryForImport,
  importAttendeesFromDiary,
} from "@/lib/site-capture/client";
import { SectionHeader } from "./SectionHeader";

interface Props {
  diary: ToolboxTalkFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updated: ToolboxTalkFull) => void;
}

interface AttendeeFormData {
  name: string;
  company: string;
  trade: string;
  signed_on_paper: boolean;
}

export function AttendeesSection({ diary, isLocked, isOpen, onToggle, onUpdate }: Props) {
  const [attendees, setAttendees] = useState(diary.attendees);
  const [isAdding, setIsAdding] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importAvailable, setImportAvailable] = useState<{ id: string; labor_count: number } | null>(null);

  const [formData, setFormData] = useState<AttendeeFormData>({
    name: "",
    company: "",
    trade: "",
    signed_on_paper: false,
  });

  // Check for daily diary to import from
  useEffect(() => {
    if (!diary.project_id && !diary.site_id) return;
    
    findDailyDiaryForImport(
      diary.company_id,
      diary.project_id,
      diary.site_id,
      diary.date
    )
      .then((result) => setImportAvailable(result))
      .catch(() => setImportAvailable(null));
  }, [diary.company_id, diary.project_id, diary.site_id, diary.date]);

  // Sync with parent
  useEffect(() => {
    setAttendees(diary.attendees);
  }, [diary.attendees]);

  const handleAddAttendee = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company.trim() || addingId) return;

    setAddingId("new");
    try {
      const attendee = await addToolboxAttendee(diary.id, {
        name: formData.name.trim(),
        company: formData.company.trim(),
        trade: formData.trade.trim() || null,
        signed_on_paper: formData.signed_on_paper,
      });
      
      const updated = [...attendees, attendee];
      setAttendees(updated);
      onUpdate({ ...diary, attendees: updated });
      
      // Reset form
      setFormData({ name: "", company: "", trade: "", signed_on_paper: false });
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add attendee:", err);
    } finally {
      setAddingId(null);
    }
  }, [formData, diary, attendees, onUpdate, addingId]);

  const handleDeleteAttendee = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteToolboxAttendee(id);
      const updated = attendees.filter((a) => a.id !== id);
      setAttendees(updated);
      onUpdate({ ...diary, attendees: updated });
    } catch (err) {
      console.error("Failed to delete attendee:", err);
    } finally {
      setDeletingId(null);
    }
  }, [attendees, diary, onUpdate]);

  const handleToggleSignedOnPaper = useCallback(async (attendee: ToolboxTalkAttendee) => {
    try {
      const updated = await updateToolboxAttendee(attendee.id, {
        signed_on_paper: !attendee.signed_on_paper,
        signed_at: !attendee.signed_on_paper ? new Date().toISOString() : null,
      });
      
      const newAttendees = attendees.map((a) => (a.id === updated.id ? updated : a));
      setAttendees(newAttendees);
      onUpdate({ ...diary, attendees: newAttendees });
    } catch (err) {
      console.error("Failed to update attendee:", err);
    }
  }, [attendees, diary, onUpdate]);

  const handleImportFromDiary = useCallback(async () => {
    if (!importAvailable) return;
    
    setImportLoading(true);
    setImportError(null);
    try {
      const imported = await importAttendeesFromDiary(diary.id, importAvailable.id);
      const updated = [...attendees, ...imported];
      setAttendees(updated);
      onUpdate({ ...diary, attendees: updated });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportLoading(false);
    }
  }, [importAvailable, diary, attendees, onUpdate]);

  const signedCount = attendees.filter((a) => a.signature_data || a.signed_on_paper).length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        title="Attendees"
        icon={
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        open={isOpen}
        onToggle={onToggle}
        badge={attendees.length > 0 ? `${signedCount}/${attendees.length} signed` : "0"}
        required
      />

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          {/* Import from diary button */}
          {!isLocked && importAvailable && importAvailable.labor_count > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleImportFromDiary}
                disabled={importLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {importLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                Import from today&apos;s labour ({importAvailable.labor_count} entries)
              </button>
              {importError && (
                <p className="mt-2 text-xs text-red-600">{importError}</p>
              )}
            </div>
          )}

          {/* Attendees Table */}
          {attendees.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Company</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Trade</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">Signature</th>
                    {!isLocked && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendees.map((attendee) => (
                    <tr key={attendee.id} className="bg-white">
                      <td className="px-3 py-2.5 text-slate-800">{attendee.name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{attendee.company}</td>
                      <td className="px-3 py-2.5 text-slate-600">{attendee.trade || "-"}</td>
                      <td className="px-3 py-2.5 text-center">
                        {!isLocked ? (
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={attendee.signed_on_paper}
                              onChange={() => handleToggleSignedOnPaper(attendee)}
                              className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-xs text-slate-600">Signed on paper</span>
                          </label>
                        ) : attendee.signed_on_paper ? (
                          <span className="text-xs text-emerald-600">Signed on paper</span>
                        ) : attendee.signature_data ? (
                          <span className="text-xs text-emerald-600">Digital signature</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not signed</span>
                        )}
                      </td>
                      {!isLocked && (
                        <td className="px-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteAttendee(attendee.id)}
                            disabled={deletingId === attendee.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 text-center">
              <p className="text-sm text-slate-500">No attendees added yet</p>
            </div>
          )}

          {/* Add Attendee Form */}
          {!isLocked && (
            <div className="mt-4">
              {!isAdding ? (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Attendee
                </button>
              ) : (
                <form onSubmit={handleAddAttendee} className="space-y-3 p-3 rounded-xl bg-slate-50">
                  <div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Full name *"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Company *"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    />
                    <input
                      type="text"
                      value={formData.trade}
                      onChange={(e) => setFormData((f) => ({ ...f, trade: e.target.value }))}
                      placeholder="Trade"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                      className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60"
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
