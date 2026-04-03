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
}

export function ContentSection({ diary, isLocked, isOpen, onToggle, onUpdate }: Props) {
  const data = diary.toolbox_talk_data ?? {} as ToolboxTalkData;
  
  const [content, setContent] = useState(data.content ?? "");
  const [attachedDocumentUrl, setAttachedDocumentUrl] = useState(data.attached_document_url ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);
    try {
      await onUpdate({
        content: content || null,
        attached_document_url: attachedDocumentUrl || null,
      });
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }, [content, attachedDocumentUrl, isDirty, saving, onUpdate]);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setIsDirty(true);
  }, []);

  const handleDocumentUrlChange = useCallback((value: string) => {
    setAttachedDocumentUrl(value);
    setIsDirty(true);
  }, []);

  const hasContent = content.trim().length > 0;
  const hasAttachment = attachedDocumentUrl.trim().length > 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        title="Talk Content"
        icon={
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        open={isOpen}
        onToggle={onToggle}
        badge={hasContent || hasAttachment ? "✓" : undefined}
      />

      {isOpen && (
        <form onSubmit={handleSubmit} className="px-4 pb-5 border-t border-slate-100">
          <div className="pt-4 space-y-4">
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Key Points Discussed
              </label>
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                disabled={isLocked}
                placeholder="Describe the main safety points, procedures, or information covered in this toolbox talk..."
                rows={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 resize-y"
              />
              <p className="mt-1 text-xs text-slate-500">
                {content.length} characters
              </p>
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Attached Document
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={attachedDocumentUrl}
                  onChange={(e) => handleDocumentUrlChange(e.target.value)}
                  disabled={isLocked}
                  placeholder="Document URL or storage path"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50"
                />
                {!isLocked && (
                  <button
                    type="button"
                    disabled={true} // Placeholder for file upload
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium disabled:opacity-50"
                  >
                    Upload
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Attach pre-prepared toolbox talk sheets, diagrams, or supporting documents
              </p>
              {hasAttachment && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="truncate">{attachedDocumentUrl}</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            {!isLocked && isDirty && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Content"}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
