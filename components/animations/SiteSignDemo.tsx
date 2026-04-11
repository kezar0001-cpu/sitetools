'use client';

import { useEffect, useState } from 'react';

const QR_PATTERN = [
  [1, 1, 1, 0, 1, 0],
  [1, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1],
  [0, 1, 0, 1, 0, 0],
  [1, 1, 0, 0, 1, 0],
  [0, 0, 1, 1, 0, 1],
];

export default function SiteSignDemo() {
  const [phase, setPhase] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [row1Visible, setRow1Visible] = useState(false);
  const [row2Visible, setRow2Visible] = useState(false);

  useEffect(() => {
    setPhase(0);
    setFadeOut(false);
    setRow1Visible(false);
    setRow2Visible(false);

    const t1 = setTimeout(() => setPhase(1), 1300);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t2b = setTimeout(() => setRow1Visible(true), 2720);
    const t3 = setTimeout(() => setPhase(3), 3900);
    const t3b = setTimeout(() => setRow2Visible(true), 4020);
    const t4 = setTimeout(() => setFadeOut(true), 5600);
    const t5 = setTimeout(() => setCycle(c => c + 1), 6100);

    return () => [t1, t2, t2b, t3, t3b, t4, t5].forEach(clearTimeout);
  }, [cycle]);

  return (
    <>
      <style>{`
        @keyframes signScanSweep {
          0% { transform: translateY(0); }
          100% { transform: translateY(88px); }
        }
      `}</style>
      <div
        className={`bg-zinc-950 rounded-2xl border border-amber-500/20 shadow-[0_0_0_1px_rgba(245,158,11,0.06)] transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="bg-zinc-900 rounded-t-2xl px-4 py-3 flex items-center gap-2 border-b border-amber-500/10">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
          <span className="ml-2 text-xs text-zinc-400 font-medium">Site Sign-In</span>
          <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-amber-300/90">
            Gate Live
          </span>
        </div>

        <div className="p-5">
          <div className="min-h-[180px] flex flex-col justify-center">
            {phase < 2 ? (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-pulse-amber rounded-xl p-1 bg-amber-500/10">
                  <div className="relative overflow-hidden rounded-lg bg-zinc-100 p-2">
                    <div
                      className="grid gap-0.5"
                      style={{ gridTemplateColumns: 'repeat(6, 14px)' }}
                    >
                      {QR_PATTERN.flat().map((cell, i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-sm ${
                            cell ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                    {phase === 1 && (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-amber-400/95 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        style={{
                          top: 8,
                          animation: 'signScanSweep 0.55s linear infinite',
                        }}
                      />
                    )}
                  </div>
                </div>
                <p className="text-sm text-zinc-400">
                  {phase === 0 ? 'Waiting for scan…' : 'Verifying worker credentials…'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-emerald-400 font-medium">Sign-in recorded ✓</p>
                <div className="rounded-xl border border-amber-500/20 bg-zinc-900/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Current occupancy</p>
                  <p className="text-amber-300 font-black text-2xl">
                    {phase >= 3 ? 16 : 15} workers on site
                  </p>
                </div>
                <div className="space-y-2 overflow-hidden">
                  <div
                    className={`flex items-center gap-3 py-2 px-3 bg-zinc-900/70 rounded-lg border border-amber-500/10 transition-all duration-500 ${
                      row1Visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-white text-sm font-medium shrink-0">J. Thompson</span>
                    <span className="text-zinc-400 text-xs flex-1 min-w-0 truncate">Labourer</span>
                    <span className="text-emerald-400 text-xs font-medium shrink-0">✓ Signed in</span>
                  </div>

                  <div
                    className={`flex items-center gap-3 py-2 px-3 bg-zinc-900/70 rounded-lg border border-amber-500/10 transition-all duration-500 ${
                      row2Visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-white text-sm font-medium shrink-0">M. Reeves</span>
                    <span className="text-zinc-400 text-xs flex-1 min-w-0 truncate">Excavator Op.</span>
                    <span className="text-emerald-400 text-xs font-medium shrink-0">✓ Signed in</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
