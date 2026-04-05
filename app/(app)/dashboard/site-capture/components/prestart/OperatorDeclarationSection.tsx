"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { OperatorDeclaration } from "@/lib/site-capture/types";
import { SectionHeader } from "../SectionHeader";

interface OperatorDeclarationSectionProps {
  declaration: OperatorDeclaration | null;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (declaration: OperatorDeclaration | null) => void;
}

interface Point {
  x: number;
  y: number;
}

export function OperatorDeclarationSection({
  declaration,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: OperatorDeclarationSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [operatorName, setOperatorName] = useState(declaration?.operatorName || "");

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
      if (isLocked) return;
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
    [isLocked, getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || isLocked) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, isLocked, getCoordinates]
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
    if (isLocked) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onUpdate(null);
  }, [isLocked, onUpdate]);

  const saveSignature = useCallback(() => {
    if (!hasSignature || !operatorName.trim()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to base64
    const signatureData = canvas.toDataURL("image/png");

    onUpdate({
      operatorName: operatorName.trim(),
      signature: signatureData,
      signedAt: new Date().toISOString(),
    });
  }, [hasSignature, operatorName, onUpdate]);

  // Auto-save when name changes if signature exists
  const handleNameChange = (name: string) => {
    setOperatorName(name);
    if (declaration && hasSignature) {
      onUpdate({
        ...declaration,
        operatorName: name.trim(),
      });
    }
  };

  const isComplete = declaration?.signature && declaration.operatorName;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Operator Declaration"
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
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
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
            {/* Operator Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Operator Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isLocked}
                placeholder="Full name of operator"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Signature Canvas */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Signature <span className="text-red-500">*</span>
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
                    isLocked
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-300 bg-white cursor-crosshair"
                  }`}
                  style={{ touchAction: "none" }}
                />
                {!hasSignature && !isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm text-slate-400">
                      Sign here with finger or mouse
                    </span>
                  </div>
                )}
                {declaration?.signature && isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Image
                      src={declaration.signature}
                      alt="Operator signature"
                      width={300}
                      height={120}
                      unoptimized
                      className="max-h-full"
                    />
                  </div>
                )}
              </div>

              {/* Canvas controls */}
              {!isLocked && (
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
                    onClick={saveSignature}
                    disabled={!hasSignature || !operatorName.trim()}
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
                    Confirm Signature
                  </button>
                </div>
              )}
            </div>

            {/* Signed indicator */}
            {declaration?.signedAt && (
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
                  Signed by {declaration.operatorName} at{" "}
                  {new Date(declaration.signedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
