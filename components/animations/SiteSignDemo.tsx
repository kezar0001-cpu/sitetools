'use client';

import { useState, useEffect } from 'react';

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

    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 3000);
    const t2b = setTimeout(() => setRow1Visible(true), 3060);
    const t3 = setTimeout(() => setPhase(3), 4500);
    const t3b = setTimeout(() => setRow2Visible(true), 4560);
    const t4 = setTimeout(() => setFadeOut(true), 5500);
    const t5 = setTimeout(() => setCycle(c => c + 1), 6000);

    return () => [t1, t2, t2b, t3, t3b, t4, t5].forEach(clearTimeout);
  }, [cycle]);

  return (
    <>
      <style>{`
        @keyframes scanSweep {
          0%   { transform: translateY(0); }
          100% { transform: translateY(88px); }
        }
      `}</style>
      <div
        className={`bg-zinc-900 rounded-2xl border border-zinc-700/50 transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Top bar */}
        <div className="bg-zinc-800 rounded-t-2xl px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-zinc-400 font-medium">Site Sign-In</span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {phase < 2 ? (
            <div className="flex flex-col items-center gap-3">
              {/* QR with pulsing amber ring */}
              <div className="animate-pulse-amber rounded-xl p-1">
                <div className="relative overflow-hidden rounded-lg bg-zinc-50 p-2">
                  <div
                    className="grid gap-0.5"
                    style={{ gridTemplateColumns: 'repeat(6, 14px)' }}
                  >
                    {QR_PATTERN.flat().map((cell, i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-sm ${
                          cell ? 'bg-amber-400' : 'bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  {/* Scanning line */}
                  {phase === 1 && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-amber-400/90 shadow-sm"
                      style={{
                        top: 8,
                        animation: 'scanSweep 0.6s linear infinite',
                      }}
                    />
                  )}
                </div>
              </div>
              <p className="text-sm text-zinc-400">
                {phase === 0 ? 'Waiting for scan...' : 'Verifying identity...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-green-400 font-medium">Sign-in recorded ✓</p>
              <p className="text-amber-400 font-black text-2xl">
                {phase >= 3 ? 16 : 15} workers on site
              </p>
              <div className="space-y-2">
                {/* Row 1 */}
                <div
                  className={`flex items-center gap-3 py-2 px-3 bg-zinc-800/50 rounded-lg transition-all duration-500 ${
                    row1Visible
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-8'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-white text-sm font-medium w-24 shrink-0">
                    J. Thompson
                  </span>
                  <span className="text-zinc-400 text-xs flex-1">Labourer</span>
                  <span className="text-zinc-400 text-xs shrink-0">07:23 AM</span>
                  <span className="text-green-400 text-xs font-medium shrink-0">
                    ✓ Signed in
                  </span>
                </div>

                {/* Row 2 */}
                {phase >= 3 && (
                  <div
                    className={`flex items-center gap-3 py-2 px-3 bg-zinc-800/50 rounded-lg transition-all duration-500 ${
                      row2Visible
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-8'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-white text-sm font-medium w-24 shrink-0">
                      M. Reeves
                    </span>
                    <span className="text-zinc-400 text-xs flex-1">Excavator Op.</span>
                    <span className="text-zinc-400 text-xs shrink-0">07:24 AM</span>
                    <span className="text-green-400 text-xs font-medium shrink-0">
                      ✓ Signed in
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
