'use client';

import { useEffect, useState } from 'react';

type Step = 'draft' | 'review' | 'approved';

export default function SiteDocsDemo() {
  const [step, setStep] = useState<Step>('draft');
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setStep('draft');
    setSignatureVisible(false);
    setStampVisible(false);
    setToastVisible(false);
    setFadeOut(false);

    const t1 = setTimeout(() => {
      setStep('review');
      setSignatureVisible(true);
    }, 1500);

    const t2 = setTimeout(() => {
      setStep('approved');
      setStampVisible(true);
    }, 3000);

    const t3 = setTimeout(() => setToastVisible(true), 3600);
    const t4 = setTimeout(() => setFadeOut(true), 5200);
    const t5 = setTimeout(() => setCycle(c => c + 1), 5800);

    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, [cycle]);

  return (
    <div
      className={`relative bg-zinc-950 rounded-2xl border border-amber-500/20 shadow-[0_0_0_1px_rgba(245,158,11,0.06)] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="bg-zinc-900 rounded-t-2xl px-4 py-3 flex items-center gap-2 border-b border-amber-500/10">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
        <span className="ml-2 text-xs text-zinc-400 font-medium">Site Docs</span>
      </div>

      <div className="p-5 space-y-3">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Document</p>
              <h4 className="text-zinc-100 font-semibold">SWMS – Stormwater Trench Works</h4>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full font-semibold ${
                step === 'draft'
                  ? 'bg-zinc-800 text-zinc-300'
                  : step === 'review'
                    ? 'bg-amber-900/60 text-amber-200'
                    : 'bg-emerald-900/60 text-emerald-300'
              }`}
            >
              {step === 'draft' ? 'Draft' : step === 'review' ? 'In Review' : 'Approved'}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs text-zinc-400">
            <p>Revision: Rev 3</p>
            <p>Prepared by: A. Collins</p>
            <p>Project: BR-14 Retaining Wall</p>
          </div>

          <div
            className={`mt-4 rounded-lg border border-amber-500/20 bg-zinc-950/80 p-3 transition-all duration-500 ${
              signatureVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Reviewer sign-off</p>
            <p className="text-amber-300 font-medium">J. Patel — Site Engineer</p>
          </div>

          {stampVisible && (
            <div className="absolute right-4 bottom-4 rotate-[-10deg] text-emerald-300 border-2 border-emerald-600 rounded-lg px-2 py-1 text-xs font-black tracking-[0.15em] animate-fade-in">
              APPROVED
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400">Template</div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400">Review</div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400">Issue</div>
        </div>
      </div>

      {toastVisible && (
        <div className="absolute right-4 top-14 rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs text-emerald-300 animate-fade-in">
          ✓ PDF pack generated and shared
        </div>
      )}
    </div>
  );
}
