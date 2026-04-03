"use client";

import { useState, useRef, useCallback } from "react";
import type { SupervisorSignOff, ClearanceDecision } from "@/lib/site-capture/types";
import { SectionHeader } from "../SectionHeader";

interface SupervisorSignOffSectionProps {
  signOff: SupervisorSignOff | null;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (signOff: SupervisorSignOff | null) => void;
  canSignOff?: boolean; // Based on user role
}

interface Point {
  x: number;
  y: number;
}

const CLEARANCE_OPTIONS: { value: ClearanceDecision; label: string; color: string }[] = [
  {
    value: "cleared",
    label: "Cleared for Operation",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  {
    value: "cleared-with-conditions",
    label: "Cleared with Conditions",
    color: "bg-amber-100 text-amber-700 border-amber-300",
  },
  {
    value: "not-cleared",
    label: "Not Cleared",
    color: "bg-red-100 text-red-700 border-red-300",
  },
];

export function SupervisorSignOffSection({
  signOff,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
  canSignOff = true,
}: SupervisorSignOffSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [supervisorName, setSupervisorName] = useState(signOff?.supervisorName || "");
  const [decision, setDecision] = useState<ClearanceDecision>(signOff?.decision || "cleared");
  const [conditions, setConditions] = useState(signOff?.conditions || "");

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isLocked || !canSignOff) return;
      e.preventDefault();
      setIsDrawing(true);
      setHasSignature(true);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    [isLocked, canSignOff, getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || isLocked || !canSignOff) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, isLocked, canSignOff, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.closePath();
  }, [isDrawing]);

  const clearSignature = useCallback(() => {
    if (isLocked || !canSignOff) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, [isLocked, canSignOff]);

  const saveSignOff = useCallback(() => {
    if (!hasSignature || !supervisorName.trim()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to base64
    const signatureData = canvas.toDataURL("image/png");

    onUpdate({
      supervisorName: supervisorName.trim(),
      signature: signatureData,
      decision,
      conditions: decision === "cleared-with-conditions" ? conditions.trim() || null : null,
      signedAt: new Date().toISOString(),
    });
  }, [hasSignature, supervisorName, decision, conditions, onUpdate]);

  const isComplete = signOff?.signature && signOff?.supervisorName;
  const showConditionsField = decision === "cleared-with-conditions";

  // Check if the section is effectively locked (no permission or already signed)
  const effectiveLocked = isLocked || !canSignOff || (signOff?.signature && isComplete);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Supervisor Sign-Off"
          icon={
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={isComplete ? undefined : 0}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4 space-y-4">
            {/* Supervisor Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Supervisor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                disabled={effectiveLocked}
                placeholder="Full name of supervisor"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Clearance Decision */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Clearance Decision <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {CLEARANCE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      decision === option.value
                        ? option.color
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${effectiveLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="clearance-decision"
                      value={option.value}
                      checked={decision === option.value}
                      onChange={() => setDecision(option.value)}
                      disabled={effectiveLocked}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditions (if cleared with conditions) */}
            {showConditionsField && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Conditions <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  disabled={effectiveLocked}
                  placeholder="Describe the conditions for clearance..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            )}

            {/* Signature Canvas */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Supervisor Signature <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className={`w-full h-32 rounded-xl border-2 border-dashed touch-none ${
                    effectiveLocked
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-300 bg-white cursor-crosshair"
                  }`}
                  style={{ touchAction: "none" }}
                />
                {!hasSignature && !signOff?.signature && !effectiveLocked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm text-slate-400">
                      Sign here with finger or mouse
                    </span>
                  </div>
                )}
                {signOff?.signature && effectiveLocked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <img
                      src={signOff.signature}
                      alt="Supervisor signature"
                      className="max-h-full"
                    />
                  </div>
                )}
              </div>

              {/* Canvas controls */}
              {!effectiveLocked && (
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={clearSignature}
                    disabled={!hasSignature}
                    className="text-sm text-slate-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Clear signature
                  </button>
                  <button
                    type="button"
                    onClick={saveSignOff}
                    disabled={
                      !hasSignature ||
                      !supervisorName.trim() ||
                      (showConditionsField && !conditions.trim())
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-300"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Confirm Sign-Off
                  </button>
                </div>
              )}

              {!canSignOff && !signOff?.signature && (
                <p className="mt-2 text-sm text-amber-600">
                  You do not have permission to sign off. Please ask a supervisor
                  or manager to complete this section.
                </p>
              )}
            </div>

            {/* Signed indicator */}
            {signOff?.signedAt && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Signed off by {signOff.supervisorName} at{" "}
                  {new Date(signOff.signedAt).toLocaleString()}
                  {" — "}
                  <span className="font-medium">
                    {CLEARANCE_OPTIONS.find((o) => o.value === signOff.decision)
                      ?.label || signOff.decision}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
