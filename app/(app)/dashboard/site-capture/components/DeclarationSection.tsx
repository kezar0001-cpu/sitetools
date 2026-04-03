"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";

export interface Declaration {
  preparedBy: string;
  preparerSignature: string;
  preparedDate: string;
  reviewedBy: string;
  reviewerSignature: string;
  reviewedDate: string;
}

interface DeclarationSectionProps {
  declaration: Declaration;
  onUpdate: (declaration: Declaration) => void;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isComplete?: boolean;
}

export function DeclarationSection({
  declaration,
  onUpdate,
  isLocked,
  isOpen,
  onToggle,
  isComplete = false,
}: DeclarationSectionProps) {
  function handleUpdate(updates: Partial<Declaration>) {
    onUpdate({ ...declaration, ...updates });
  }

  // Simple signature capture simulation (checkbox for now, can be enhanced with canvas)
  function SignatureField({
    label,
    signed,
    onSign,
    signature,
    date,
    onDateChange,
  }: {
    label: string;
    signed: boolean;
    onSign: () => void;
    signature: string;
    date: string;
    onDateChange: (date: string) => void;
  }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {signed && signature && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Signed
            </span>
          )}
        </div>

        {/* Name field */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
          <input
            type="text"
            value={label.includes("Prepared") ? declaration.preparedBy : declaration.reviewedBy}
            onChange={(e) =>
              handleUpdate(
                label.includes("Prepared") ? { preparedBy: e.target.value } : { reviewedBy: e.target.value }
              )
            }
            disabled={isLocked}
            placeholder="Full name"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
          />
        </div>

        {/* Signature toggle */}
        {!isLocked && (
          <button
            type="button"
            onClick={onSign}
            className={`w-full py-3 rounded-lg border-2 border-dashed font-medium text-sm transition-colors ${
              signed
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-600"
            }`}
          >
            {signed ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Signature Captured
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Click to Sign
              </span>
            )}
          </button>
        )}

        {/* Date field */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={isLocked}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Declaration"
          icon={
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={isComplete ? "✓" : undefined}
        />
      </div>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4 space-y-4">
            {/* Preparer Declaration */}
            <SignatureField
              label="Report Prepared By"
              signed={!!declaration.preparerSignature}
              onSign={() => handleUpdate({ preparerSignature: declaration.preparerSignature ? "" : "signed" })}
              signature={declaration.preparerSignature}
              date={declaration.preparedDate}
              onDateChange={(date) => handleUpdate({ preparedDate: date })}
            />

            {/* Reviewer Declaration */}
            <SignatureField
              label="Reviewed By"
              signed={!!declaration.reviewerSignature}
              onSign={() => handleUpdate({ reviewerSignature: declaration.reviewerSignature ? "" : "signed" })}
              signature={declaration.reviewerSignature}
              date={declaration.reviewedDate}
              onDateChange={(date) => handleUpdate({ reviewedDate: date })}
            />

            {/* Completion Notice */}
            {isComplete && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-800">
                  This incident report has been completed and signed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
