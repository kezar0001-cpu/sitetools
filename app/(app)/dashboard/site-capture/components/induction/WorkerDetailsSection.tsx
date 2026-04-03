"use client";

import { useState, useCallback } from "react";
import { SectionHeader } from "../SectionHeader";
import type { WorkerDetails } from "@/lib/site-capture/induction-types";

interface WorkerDetailsSectionProps {
  workerDetails: WorkerDetails;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (details: WorkerDetails) => void;
}

export function WorkerDetailsSection({
  workerDetails,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: WorkerDetailsSectionProps) {
  const [localDetails, setLocalDetails] = useState(workerDetails);

  // Sync with parent when workerDetails changes externally
  const handleBlur = useCallback(
    (field: keyof WorkerDetails, value: string) => {
      const updated = { ...localDetails, [field]: value };
      setLocalDetails(updated);
      onUpdate(updated);
    },
    [localDetails, onUpdate]
  );

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      // In a real implementation, this would upload to storage
      // For now, we'll create a data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const updated = { ...localDetails, photoIdUrl: dataUrl };
        setLocalDetails(updated);
        onUpdate(updated);
      };
      reader.readAsDataURL(file);
    },
    [localDetails, onUpdate]
  );

  const handleRemovePhoto = useCallback(() => {
    const updated = { ...localDetails, photoIdUrl: null, photoIdPath: null };
    setLocalDetails(updated);
    onUpdate(updated);
  }, [localDetails, onUpdate]);

  const isComplete =
    workerDetails.fullName.trim() !== "" &&
    workerDetails.company.trim() !== "" &&
    workerDetails.trade.trim() !== "";

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Worker Details"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={isComplete ? undefined : 1}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Name and Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localDetails.fullName}
                onChange={(e) => setLocalDetails((prev) => ({ ...prev, fullName: e.target.value }))}
                onBlur={(e) => handleBlur("fullName", e.target.value)}
                disabled={isLocked}
                placeholder="Enter full name"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Company / Employer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localDetails.company}
                onChange={(e) => setLocalDetails((prev) => ({ ...prev, company: e.target.value }))}
                onBlur={(e) => handleBlur("company", e.target.value)}
                disabled={isLocked}
                placeholder="Enter company name"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Trade and Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Trade / Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localDetails.trade}
                onChange={(e) => setLocalDetails((prev) => ({ ...prev, trade: e.target.value }))}
                onBlur={(e) => handleBlur("trade", e.target.value)}
                disabled={isLocked}
                placeholder="e.g., Carpenter, Electrician"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number</label>
              <input
                type="tel"
                value={localDetails.mobileNumber}
                onChange={(e) => setLocalDetails((prev) => ({ ...prev, mobileNumber: e.target.value }))}
                onBlur={(e) => handleBlur("mobileNumber", e.target.value)}
                disabled={isLocked}
                placeholder="04XX XXX XXX"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Emergency Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1.5">Contact Name</label>
                <input
                  type="text"
                  value={localDetails.emergencyContactName}
                  onChange={(e) => setLocalDetails((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                  onBlur={(e) => handleBlur("emergencyContactName", e.target.value)}
                  disabled={isLocked}
                  placeholder="Emergency contact name"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1.5">Contact Phone</label>
                <input
                  type="tel"
                  value={localDetails.emergencyContactPhone}
                  onChange={(e) => setLocalDetails((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  onBlur={(e) => handleBlur("emergencyContactPhone", e.target.value)}
                  disabled={isLocked}
                  placeholder="Emergency contact phone"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Photo ID Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Photo ID</label>
            {localDetails.photoIdUrl ? (
              <div className="relative inline-block">
                <img
                  src={localDetails.photoIdUrl}
                  alt="Worker ID"
                  className="w-32 h-40 object-cover rounded-xl border border-slate-200"
                />
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    aria-label="Remove uploaded worker ID photo"
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center w-32 h-40 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors ${
                  isLocked ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs text-slate-500 text-center px-2">Upload ID Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  disabled={isLocked}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
