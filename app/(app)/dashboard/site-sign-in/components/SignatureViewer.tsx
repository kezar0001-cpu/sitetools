"use client";

import Image from "next/image";

interface SignatureViewerProps {
  isOpen: boolean;
  signature: string | null;
  onClose: () => void;
}

export function SignatureViewer({ isOpen, signature, onClose }: SignatureViewerProps) {
  if (!isOpen || !signature) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl p-5 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-900">Visitor Signature</h3>
        <div className="mt-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
          <Image src={signature} alt="Signature" width={640} height={240} unoptimized className="w-full h-auto" />
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2.5 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
