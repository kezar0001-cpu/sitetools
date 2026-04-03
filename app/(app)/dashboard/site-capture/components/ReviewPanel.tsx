"use client";

import { useState } from "react";
import { approveDiary, rejectDiary, submitDiary } from "@/lib/site-capture/client";
import type { SiteDiaryFull } from "@/lib/site-capture/types";
import type { CompanyRole } from "@/lib/workspace/types";

interface ReviewPanelProps {
  diary: SiteDiaryFull;
  userRole?: CompanyRole | null;
  onUpdate: (updated: SiteDiaryFull) => void;
}

export function ReviewPanel({ diary, userRole, onUpdate }: ReviewPanelProps) {
  const isCompleted = diary.status === "completed";
  const isDraft = diary.status === "draft";
  const canSubmit = diary.status === "draft";
  const canReview =
    diary.status === "draft" &&
    (userRole === "owner" || userRole === "admin" || userRole === "manager");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await submitDiary(diary.id);
      const next = { ...diary, ...updated };
      onUpdate(next);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setReviewError(null);
    try {
      const updated = await approveDiary(diary.id);
      const next = { ...diary, ...updated };
      onUpdate(next);
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
      onUpdate(next);
      setShowRejectForm(false);
      setRejectNote("");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to reject.");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
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
            {isDraft ? "Resubmit for Review" : "Submit for Review"}
          </button>
        </div>
      )}

      {/* ── Pending review indicator (submitted, not an admin reviewer) ── */}
      {false && !canReview && (
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
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Diary Completed
        </div>
      )}
    </>
  );
}
