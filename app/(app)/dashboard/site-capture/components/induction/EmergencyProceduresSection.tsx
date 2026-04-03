"use client";

import { useState, useCallback } from "react";
import { SectionHeader } from "../SectionHeader";
import type { EmergencyProcedures } from "@/lib/site-capture/induction-types";

interface EmergencyProceduresSectionProps {
  emergencyProcedures: EmergencyProcedures;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (procedures: EmergencyProcedures) => void;
}

export function EmergencyProceduresSection({
  emergencyProcedures,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: EmergencyProceduresSectionProps) {
  const [localProcedures, setLocalProcedures] = useState(emergencyProcedures);

  const handleBlur = useCallback(
    (field: keyof EmergencyProcedures, value: string) => {
      const updated = { ...localProcedures, [field]: value };
      setLocalProcedures(updated);
      onUpdate(updated);
    },
    [localProcedures, onUpdate]
  );

  const hasMinimumInfo =
    emergencyProcedures.siteAddress.trim() !== "" &&
    emergencyProcedures.nearestHospital.trim() !== "";

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Emergency Procedures"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={!hasMinimumInfo ? 1 : undefined}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Site Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Site Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={localProcedures.siteAddress}
              onChange={(e) => setLocalProcedures((prev) => ({ ...prev, siteAddress: e.target.value }))}
              onBlur={(e) => handleBlur("siteAddress", e.target.value)}
              disabled={isLocked}
              placeholder="Full site address for emergency services"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50 resize-none"
            />
          </div>

          {/* Nearest Hospital */}
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Nearest Hospital
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-red-900 mb-1.5">Hospital Name</label>
                <input
                  type="text"
                  value={localProcedures.nearestHospital}
                  onChange={(e) => setLocalProcedures((prev) => ({ ...prev, nearestHospital: e.target.value }))}
                  onBlur={(e) => handleBlur("nearestHospital", e.target.value)}
                  disabled={isLocked}
                  placeholder="Hospital name"
                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-900 mb-1.5">Hospital Phone</label>
                <input
                  type="tel"
                  value={localProcedures.nearestHospitalPhone}
                  onChange={(e) => setLocalProcedures((prev) => ({ ...prev, nearestHospitalPhone: e.target.value }))}
                  onBlur={(e) => handleBlur("nearestHospitalPhone", e.target.value)}
                  disabled={isLocked}
                  placeholder="(0X) XXXX XXXX"
                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-red-900 mb-1.5">Hospital Address</label>
              <textarea
                value={localProcedures.nearestHospitalAddress}
                onChange={(e) => setLocalProcedures((prev) => ({ ...prev, nearestHospitalAddress: e.target.value }))}
                onBlur={(e) => handleBlur("nearestHospitalAddress", e.target.value)}
                disabled={isLocked}
                placeholder="Hospital address for emergency services"
                rows={2}
                className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 disabled:opacity-50 disabled:bg-slate-50 resize-none"
              />
            </div>
          </div>

          {/* Muster Point */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Emergency Muster Point
            </label>
            <input
              type="text"
              value={localProcedures.musterPoint}
              onChange={(e) => setLocalProcedures((prev) => ({ ...prev, musterPoint: e.target.value }))}
              onBlur={(e) => handleBlur("musterPoint", e.target.value)}
              disabled={isLocked}
              placeholder="Location where workers gather during emergencies"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          {/* First Aid Officer */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              First Aid Officer
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-900 mb-1.5">Officer Name</label>
                <input
                  type="text"
                  value={localProcedures.firstAidOfficerName}
                  onChange={(e) => setLocalProcedures((prev) => ({ ...prev, firstAidOfficerName: e.target.value }))}
                  onBlur={(e) => handleBlur("firstAidOfficerName", e.target.value)}
                  disabled={isLocked}
                  placeholder="First aid officer name"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-900 mb-1.5">Contact Number</label>
                <input
                  type="tel"
                  value={localProcedures.firstAidOfficerContact}
                  onChange={(e) => setLocalProcedures((prev) => ({ ...prev, firstAidOfficerContact: e.target.value }))}
                  onBlur={(e) => handleBlur("firstAidOfficerContact", e.target.value)}
                  disabled={isLocked}
                  placeholder="Contact number"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Emergency Contact Number
            </label>
            <input
              type="tel"
              value={localProcedures.emergencyContactNumber}
              onChange={(e) => setLocalProcedures((prev) => ({ ...prev, emergencyContactNumber: e.target.value }))}
              onBlur={(e) => handleBlur("emergencyContactNumber", e.target.value)}
              disabled={isLocked}
              placeholder="e.g., 000 or site-specific emergency number"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
            />
            <p className="text-xs text-slate-500 mt-1">Default is 000 for emergency services</p>
          </div>
        </div>
      )}
    </div>
  );
}
