"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { SectionHeader } from "./SectionHeader";
import type { SiteDiaryFull, InspectionSignOff } from "@/lib/site-capture/types";
import { loadSignatureCanvas, preloadSignatureCanvas } from "@/lib/dynamicImports";
import type SignatureCanvasType from "react-signature-canvas";

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
  const inspectorRef = useRef<SignatureCanvasType>(null);
  const clientRef = useRef<SignatureCanvasType>(null);
  const [inspectorName, setInspectorName] = useState(signOff?.client_representative_name || "");
  const [clientName, setClientName] = useState(signOff?.client_representative_name || "");
  const [date, setDate] = useState(signOff?.sign_off_date || new Date().toISOString().split("T")[0]);

  // Dynamic import state for signature canvas
  const [SignatureCanvas, setSignatureCanvas] = useState<typeof SignatureCanvasType | null>(null);
  const [isCanvasLoading, setIsCanvasLoading] = useState(false);

  // Load signature canvas when section is opened
  useEffect(() => {
    if (isOpen && !SignatureCanvas && !isLocked) {
      setIsCanvasLoading(true);
      loadSignatureCanvas()
        .then((module) => {
          setSignatureCanvas(() => module.default);
        })
        .catch((err) => {
          console.error("Failed to load signature canvas:", err);
        })
        .finally(() => {
          setIsCanvasLoading(false);
        });
    }
  }, [isOpen, SignatureCanvas, isLocked]);

  // Preload on hover over section header
  const handleHeaderMouseEnter = useCallback(() => {
    if (!SignatureCanvas && !isCanvasLoading) {
      preloadSignatureCanvas();
    }
  }, [SignatureCanvas, isCanvasLoading]);

  const handleSaveInspector = useCallback(() => {
    if (inspectorRef.current && !inspectorRef.current.isEmpty()) {
      const signatureData = inspectorRef.current.toDataURL();
      onSignOffChange({
        inspector_signature: signatureData,
        inspector_signed_at: new Date().toISOString(),
        client_representative_name: clientName || inspectorName || null,
        client_representative_signature: signOff?.client_representative_signature || null,
        client_representative_signed_at: signOff?.client_representative_signed_at || null,
        sign_off_date: date,
      });
    }
  }, [inspectorName, clientName, date, signOff?.client_representative_signature, signOff?.client_representative_signed_at, onSignOffChange]);

  const handleSaveClient = useCallback(() => {
    if (clientRef.current && !clientRef.current.isEmpty()) {
      const signatureData = clientRef.current.toDataURL();
      onSignOffChange({
        inspector_signature: signOff?.inspector_signature || null,
        inspector_signed_at: signOff?.inspector_signed_at || null,
        client_representative_name: clientName || inspectorName || null,
        client_representative_signature: signatureData,
        client_representative_signed_at: new Date().toISOString(),
        sign_off_date: date,
      });
    }
  }, [inspectorName, clientName, date, signOff?.inspector_signature, signOff?.inspector_signed_at, onSignOffChange]);

  const handleClearInspector = () => {
    inspectorRef.current?.clear();
  };

  const handleClearClient = () => {
    clientRef.current?.clear();
  };

  const isComplete = !!(signOff?.inspector_signature && signOff?.sign_off_date);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4" onMouseEnter={handleHeaderMouseEnter}>
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
                  onSignOffChange({ ...signOff, sign_off_date: e.target.value });
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
                <Image
                  src={signOff.inspector_signature}
                  alt="Inspector signature"
                  width={500}
                  height={128}
                  unoptimized
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
                  {isCanvasLoading || !SignatureCanvas ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white h-32 flex items-center justify-center">
                      {isCanvasLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-6 h-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span className="text-xs text-slate-500">Loading signature pad...</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Click to enable signature</span>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
                      <SignatureCanvas
                        ref={inspectorRef}
                        canvasProps={{
                          className: "w-full h-32 cursor-crosshair",
                        }}
                        backgroundColor="white"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearInspector}
                      disabled={!SignatureCanvas || isCanvasLoading}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveInspector}
                      disabled={!inspectorName.trim() || !SignatureCanvas || isCanvasLoading || inspectorRef.current?.isEmpty()}
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

            {signOff?.client_representative_signature ? (
              <div className="relative">
                <Image
                  src={signOff.client_representative_signature}
                  alt="Client signature"
                  width={500}
                  height={128}
                  unoptimized
                  className="w-full h-32 bg-white border border-slate-200 rounded-lg object-contain"
                />
                {!isLocked && (
                  <button
                    onClick={() => onSignOffChange({ ...signOff, client_representative_signature: null })}
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
                  {isCanvasLoading || !SignatureCanvas ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white h-32 flex items-center justify-center">
                      {isCanvasLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-6 h-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span className="text-xs text-slate-500">Loading signature pad...</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Click to enable signature</span>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
                      <SignatureCanvas
                        ref={clientRef}
                        canvasProps={{
                          className: "w-full h-32 cursor-crosshair",
                        }}
                        backgroundColor="white"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearClient}
                      disabled={!SignatureCanvas || isCanvasLoading}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveClient}
                      disabled={!SignatureCanvas || isCanvasLoading || clientRef.current?.isEmpty()}
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
