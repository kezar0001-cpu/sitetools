"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteDiaryFull } from "@/lib/diary/types";
import { archiveDiary, restoreDiary, deleteDiary } from "@/lib/diary/client";

interface DiaryActionsProps {
  diary: SiteDiaryFull;
  userRole: string | null;
  userId: string | null;
  onUpdate: (diary: SiteDiaryFull) => void;
}

export function DiaryActions({ diary, userRole, userId, onUpdate }: DiaryActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canDelete = userRole === "owner" || userRole === "admin" || diary.created_by === userId;
  const canArchive = userRole === "owner" || userRole === "admin" || userRole === "manager" || diary.created_by === userId;

  const isArchived = diary.status === "archived";

  async function handleArchive() {
    if (!canArchive) return;
    setIsArchiving(true);
    try {
      if (isArchived) {
        const updated = await restoreDiary(diary.id);
        onUpdate({ ...diary, ...updated });
      } else {
        const updated = await archiveDiary(diary.id);
        onUpdate({ ...diary, ...updated });
      }
    } catch (err) {
      console.error("Failed to archive/restore diary:", err);
      alert(err instanceof Error ? err.message : "Failed to update diary status");
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await deleteDiary(diary.id);
      router.push("/dashboard/diary");
    } catch (err) {
      console.error("Failed to delete diary:", err);
      alert(err instanceof Error ? err.message : "Failed to delete diary");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Archive/Restore Button */}
        {canArchive && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isArchived
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            } disabled:opacity-50`}
            title={isArchived ? "Restore to draft" : "Archive diary"}
          >
            {isArchiving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : isArchived ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restore
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </>
            )}
          </button>
        )}

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            title="Delete diary permanently"
          >
            {isDeleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </>
            )}
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Diary?</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              This action cannot be undone. All diary data including labor, equipment, photos, and issues will be permanently deleted.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>Tip:</strong> Consider archiving instead if you want to keep the record but hide it from active views.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
