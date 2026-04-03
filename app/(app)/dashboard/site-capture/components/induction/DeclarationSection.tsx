"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SectionHeader } from "../SectionHeader";
import type { InductionSignature } from "@/lib/site-capture/induction-types";

interface DeclarationSectionProps {
  signature: InductionSignature;
  declarationConfirmed: boolean;
  declarationConfirmedAt: string | null;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateSignature: (signature: InductionSignature) => void;
  onUpdateDeclaration: (confirmed: boolean) => void;
}

export function DeclarationSection({
  signature,
  declarationConfirmed,
  declarationConfirmedAt,
  isLocked,
  isOpen,
  onToggle,
  onUpdateSignature,
  onUpdateDeclaration,
}: DeclarationSectionProps) {
  const workerCanvasRef = useRef<HTMLCanvasElement>(null);
  const officerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isWorkerDrawing, setIsWorkerDrawing] = useState(false);
  const [isOfficerDrawing, setIsOfficerDrawing] = useState(false);
  const [localOfficerName, setLocalOfficerName] = useState(signature.inductionOfficerName);

  // Initialize canvases with existing signature data
  useEffect(() => {
    if (signature.workerSignatureData && workerCanvasRef.current) {
      const ctx = workerCanvasRef.current.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, workerCanvasRef.current!.width, workerCanvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = signature.workerSignatureData;
      }
    }
  }, [signature.workerSignatureData]);

  useEffect(() => {
    if (signature.officerSignatureData && officerCanvasRef.current) {
      const ctx = officerCanvasRef.current.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, officerCanvasRef.current!.width, officerCanvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = signature.officerSignatureData;
      }
    }
  }, [signature.officerSignatureData]);

  // Canvas drawing handlers
  const getCanvasCoordinates = (canvas: HTMLCanvasElement, event: React.MouseEvent | React.TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    setIsDrawing: (val: boolean) => void
  ) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!canvasRef.current || isLocked) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoordinates(canvasRef.current, e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const draw = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    isDrawing: boolean
  ) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoordinates(canvasRef.current, e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    setIsDrawing: (val: boolean) => void,
    onSave: (dataUrl: string) => void
  ) => () => {
    if (!canvasRef.current) return;
    setIsDrawing(false);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  const clearCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    onClear: () => void
  ) => () => {
    if (!canvasRef.current || isLocked) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onClear();
  };

  const handleDeclarationToggle = useCallback(() => {
    if (isLocked) return;
    onUpdateDeclaration(!declarationConfirmed);
  }, [declarationConfirmed, isLocked, onUpdateDeclaration]);

  const handleOfficerNameBlur = useCallback(() => {
    onUpdateSignature({ ...signature, inductionOfficerName: localOfficerName });
  }, [localOfficerName, signature, onUpdateSignature]);

  const isComplete =
    declarationConfirmed &&
    !!signature.workerSignatureData &&
    !!signature.officerSignatureData &&
    signature.inductionOfficerName.trim() !== "";

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Declaration & Sign-off"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={!isComplete ? 1 : undefined}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-6">
          {/* Declaration Checkbox */}
          <div
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${
              declarationConfirmed
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200 hover:border-amber-300"
            }`}
            onClick={handleDeclarationToggle}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="flex-shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  checked={declarationConfirmed}
                  onChange={() => {}} // Handled by parent onClick
                  disabled={isLocked}
                  className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                />
              </div>
              <div className="flex-1">
                <p className={`font-medium ${declarationConfirmed ? "text-emerald-800" : "text-amber-800"}`}>
                  I confirm I have read and understood the above
                </p>
                <p className={`text-sm mt-1 ${declarationConfirmed ? "text-emerald-600" : "text-amber-600"}`}>
                  By checking this box, I acknowledge all hazards, site rules, and emergency procedures have been
                  explained to me, and I understand my obligations while working on this site.
                </p>
                {declarationConfirmed && declarationConfirmedAt && (
                  <p className="text-xs text-emerald-600 mt-2">
                    Confirmed at{" "}
                    {new Date(declarationConfirmedAt).toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Worker Signature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Worker Signature</label>
              {!isLocked && signature.workerSignatureData && (
                <button
                  type="button"
                  onClick={clearCanvas(workerCanvasRef, () =>
                    onUpdateSignature({ ...signature, workerSignatureData: null, workerSignedAt: null })
                  )}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div
              className={`relative rounded-xl border-2 border-slate-300 overflow-hidden ${
                isLocked ? "bg-slate-50" : "bg-white"
              }`}
            >
              <canvas
                ref={workerCanvasRef}
                width={400}
                height={120}
                className={`w-full h-32 ${isLocked ? "cursor-default" : "cursor-crosshair"}`}
                onMouseDown={startDrawing(workerCanvasRef, setIsWorkerDrawing)}
                onMouseMove={draw(workerCanvasRef, isWorkerDrawing)}
                onMouseUp={stopDrawing(workerCanvasRef, setIsWorkerDrawing, (dataUrl) =>
                  onUpdateSignature({
                    ...signature,
                    workerSignatureData: dataUrl,
                    workerSignedAt: new Date().toISOString(),
                  })
                )}
                onMouseLeave={stopDrawing(workerCanvasRef, setIsWorkerDrawing, (dataUrl) =>
                  onUpdateSignature({
                    ...signature,
                    workerSignatureData: dataUrl,
                    workerSignedAt: new Date().toISOString(),
                  })
                )}
                onTouchStart={startDrawing(workerCanvasRef, setIsWorkerDrawing)}
                onTouchMove={draw(workerCanvasRef, isWorkerDrawing)}
                onTouchEnd={stopDrawing(workerCanvasRef, setIsWorkerDrawing, (dataUrl) =>
                  onUpdateSignature({
                    ...signature,
                    workerSignatureData: dataUrl,
                    workerSignedAt: new Date().toISOString(),
                  })
                )}
              />
              {!signature.workerSignatureData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-slate-400 text-sm">Sign here with mouse or touch</span>
                </div>
              )}
            </div>
            {signature.workerSignedAt && (
              <p className="text-xs text-slate-500">
                Signed at{" "}
                {new Date(signature.workerSignedAt).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>

          {/* Induction Officer */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Induction Officer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={localOfficerName}
                onChange={(e) => setLocalOfficerName(e.target.value)}
                onBlur={handleOfficerNameBlur}
                disabled={isLocked}
                placeholder="Name of person conducting the induction"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 disabled:bg-slate-50"
              />
            </div>

            {/* Officer Signature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Induction Officer Signature</label>
                {!isLocked && signature.officerSignatureData && (
                  <button
                    type="button"
                    onClick={clearCanvas(officerCanvasRef, () =>
                      onUpdateSignature({ ...signature, officerSignatureData: null, officerSignedAt: null })
                    )}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div
                className={`relative rounded-xl border-2 border-slate-300 overflow-hidden ${
                  isLocked ? "bg-slate-50" : "bg-white"
                }`}
              >
                <canvas
                  ref={officerCanvasRef}
                  width={400}
                  height={120}
                  className={`w-full h-32 ${isLocked ? "cursor-default" : "cursor-crosshair"}`}
                  onMouseDown={startDrawing(officerCanvasRef, setIsOfficerDrawing)}
                  onMouseMove={draw(officerCanvasRef, isOfficerDrawing)}
                  onMouseUp={stopDrawing(officerCanvasRef, setIsOfficerDrawing, (dataUrl) =>
                    onUpdateSignature({
                      ...signature,
                      officerSignatureData: dataUrl,
                      officerSignedAt: new Date().toISOString(),
                    })
                  )}
                  onMouseLeave={stopDrawing(officerCanvasRef, setIsOfficerDrawing, (dataUrl) =>
                    onUpdateSignature({
                      ...signature,
                      officerSignatureData: dataUrl,
                      officerSignedAt: new Date().toISOString(),
                    })
                  )}
                  onTouchStart={startDrawing(officerCanvasRef, setIsOfficerDrawing)}
                  onTouchMove={draw(officerCanvasRef, isOfficerDrawing)}
                  onTouchEnd={stopDrawing(officerCanvasRef, setIsOfficerDrawing, (dataUrl) =>
                    onUpdateSignature({
                      ...signature,
                      officerSignatureData: dataUrl,
                      officerSignedAt: new Date().toISOString(),
                    })
                  )}
                />
                {!signature.officerSignatureData && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-slate-400 text-sm">Sign here with mouse or touch</span>
                  </div>
                )}
              </div>
              {signature.officerSignedAt && (
                <p className="text-xs text-slate-500">
                  Signed at{" "}
                  {new Date(signature.officerSignedAt).toLocaleString("en-AU", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Completion Status */}
          {isComplete ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-emerald-800">Declaration complete</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium">Complete the following to finish:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {!declarationConfirmed && <li>• Confirm declaration checkbox</li>}
                  {!signature.workerSignatureData && <li>• Worker signature required</li>}
                  {!signature.inductionOfficerName.trim() && <li>• Induction officer name required</li>}
                  {!signature.officerSignatureData && <li>• Induction officer signature required</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
