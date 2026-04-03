"use client";

import { useRef, useState, useCallback } from "react";
import { SectionHeader } from "./SectionHeader";
import type {
  SiteDiaryFull,
  InspectionSignOff,
} from "@/lib/site-capture/types";
import SignatureCanvas from "react-signature-canvas";

interface SiteInspectionSignOffSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  signOff: InspectionSignOff | null;
  onSignOffChange: (signOff: InspectionSignOff) => void;
}

export function SiteInspectionSignOffSection({
  isLocked,
  isOpen,
  onToggle,
  signOff,
  onSignOffChange,
}: SiteInspectionSignOffSectionProps) {
  const inspectorRef = useRef<SignatureCanvas>(null);
  const clientRef = useRef<SignatureCanvas>(null);
  const [inspectorName, setInspectorName] = useState(signOff?.inspector_name || "");
  const [clientName, setClientName] = useState(signOff?.client_rep_name || "");
  const [date, setDate] = useState(signOff?.date || new Date().toISOString().split("T")[0]);

  const handleSaveInspector = useCallback(() => {
    if (inspectorRef.current && !inspectorRef.current.isEmpty()) {
      const signatureData = inspectorRef.current.toDataURL();
      onSignOffChange({
        inspector_name: inspectorName,
        inspector_signature: signatureData,
        client_rep_name: clientName,
        client_rep_signature: signOff?.client_rep_signature || null,
        date,
        submitted_at: new Date().toISOString(),
      });
    }
  }, [inspectorName, clientName, date, signOff?.client_rep_signature, onSignOffChange]);

  const handleSaveClient = useCallback(() => {
    if (clientRef.current && !clientRef.current.isEmpty()) {
      const signatureData = clientRef.current.toDataURL();
      onSignOffChange({
        inspector_name: inspectorName,
        inspector_signature: signOff?.inspector_signature || null,
        client_rep_name: clientName,
        client_rep_signature: signatureData,
        date,
        submitted_at: new Date().toISOString(),
      });
    }
  }, [inspectorName, clientName, date, signOff?.inspector_signature, onSignOffChange]);

  const handleClearInspector = () => {
    inspectorRef.current?.clear();
  };

  const handleClearClient = () => {
    clientRef.current?.clear();
  };

  const isComplete = !!(signOff?.inspector_name && signOff?.inspector_signature && signOff?.date);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Sign-off"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={isComplete ? "Complete" : "Required"}
          badgeClass={isComplete ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Inspection Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (signOff) {
                  onSignOffChange({ ...signOff, date: e.target.value });
                }
              }}
              disabled={isLocked}
              className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50"
            />
          </div>

          {/* Inspector Signature */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Inspector</h4>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              disabled={isLocked}
              placeholder="Inspector name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 mb-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50"
            />

            {signOff?.inspector_signature ? (
              <div className="relative">
                <img
                  src={signOff.inspector_signature}
                  alt="Inspector signature"
                  className="w-full h-32 bg-white border border-slate-200 rounded-lg object-contain"
                />
                {!isLocked && (
                  <button
                    onClick={() => onSignOffChange({ ...signOff, inspector_signature: null })}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              !isLocked && (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={inspectorRef}
                      canvasProps={{
                        className: "w-full h-32 cursor-crosshair",
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearInspector}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveInspector}
                      disabled={!inspectorName.trim() || inspectorRef.current?.isEmpty()}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Client Representative Signature */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Client Representative (Optional)</h4>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={isLocked}
              placeholder="Client representative name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 mb-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50"
            />

            {signOff?.client_rep_signature ? (
              <div className="relative">
                <img
                  src={signOff.client_rep_signature}
                  alt="Client signature"
                  className="w-full h-32 bg-white border border-slate-200 rounded-lg object-contain"
                />
                {!isLocked && (
                  <button
                    onClick={() => onSignOffChange({ ...signOff, client_rep_signature: null })}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              !isLocked && (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={clientRef}
                      canvasProps={{
                        className: "w-full h-32 cursor-crosshair",
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearClient}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveClient}
                      disabled={clientRef.current?.isEmpty()}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Save Signature
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Submission note */}
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p className="font-medium text-slate-700">Submission Requirements:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Inspector name and signature are required to submit</li>
              <li>Client representative signature is optional</li>
              <li>Date must be set</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
