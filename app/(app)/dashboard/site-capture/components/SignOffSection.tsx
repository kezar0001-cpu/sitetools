"use client";

import { useState, useCallback, FormEvent } from "react";
import type { ToolboxTalkFull, ToolboxTalkData } from "@/lib/site-capture/types";
import { SectionHeader } from "./SectionHeader";

interface Props {
  diary: ToolboxTalkFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<ToolboxTalkData>) => Promise<void>;
  userId?: string | null;
}

export function SignOffSection({ diary, isLocked, isOpen, onToggle, onUpdate, userId }: Props) {
  const data = diary.toolbox_talk_data ?? {} as ToolboxTalkData;
  
  const [presenterName, setPresenterName] = useState(data.conducted_by_name ?? "");
  const [isSigned, setIsSigned] = useState(!!data.presenter_signature);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSign = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (saving || isLocked) return;

    setSaving(true);
    try {
      // In a real implementation, this would capture a signature
      // For now, we'll use a placeholder signature reference
      await onUpdate({
        presenter_signature: `signature_${userId}_${Date.now()}`,
        presenter_signed_at: new Date().toISOString(),
      });
      setIsSigned(true);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }, [saving, isLocked, onUpdate, userId]);

  const handleNameChange = useCallback((value: string) => {
    setPresenterName(value);
    setIsDirty(true);
  }, []);

  const handleSaveName = useCallback(async () => {
    if (!isDirty || saving) return;
    
    setSaving(true);
    try {
      await onUpdate({
        conducted_by_name: presenterName || null,
      });
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }, [presenterName, isDirty, saving, onUpdate]);

  const signedDate = data.presenter_signed_at
    ? new Date(data.presenter_signed_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        title="Presenter Sign Off"
        icon={
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        }
        open={isOpen}
        onToggle={onToggle}
        badge={isSigned ? "✓ Signed" : undefined}
      />

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="pt-4 space-y-4">
            {/* Presenter Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Presenter Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presenterName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isLocked}
                  placeholder="Full name of presenter"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-50"
                />
                {!isLocked && isDirty && (
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-60"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                )}
              </div>
            </div>

            {/* Signature Area */}
            {isSigned ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-emerald-800">Signed by {data.conducted_by_name || "Presenter"}</p>
                    {signedDate && (
                      <p className="text-sm text-emerald-600">{signedDate}</p>
                    )}
                  </div>
                </div>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({
                        presenter_signature: null,
                        presenter_signed_at: null,
                      });
                      setIsSigned(false);
                    }}
                    className="mt-3 text-sm text-emerald-700 hover:underline"
                  >
                    Remove signature
                  </button>
                )}
              </div>
            ) : (
              <div>
                {!isLocked ? (
                  <form onSubmit={handleSign}>
                    <button
                      type="submit"
                      disabled={saving || !presenterName.trim()}
                      className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 font-medium hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Signing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {presenterName.trim() ? "Sign as Presenter" : "Enter name to sign"}
                        </span>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="py-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-sm text-slate-500">Not signed</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  By signing, you confirm that this toolbox talk was conducted and all attendees were present.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
