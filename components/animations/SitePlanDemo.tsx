'use client';

import { useEffect, useState } from 'react';

type DrainageLabel = 'In Progress' | 'On Track ↑';

function statusChip(label: string) {
  const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
  if (label === 'Complete') return `${base} bg-emerald-900/50 text-emerald-300`;
  if (label === 'On Track ↑') return `${base} bg-amber-900/60 text-amber-200`;
  if (label === 'In Progress') return `${base} bg-amber-900/30 text-amber-300`;
  return `${base} bg-zinc-800 text-zinc-500`;
}

export default function SitePlanDemo() {
  const [drainageWidth, setDrainageWidth] = useState(65);
  const [drainageLabel, setDrainageLabel] = useState<DrainageLabel>('In Progress');
  const [showDelta, setShowDelta] = useState(false);
  const [showDelayCard, setShowDelayCard] = useState(false);
  const [delayCardVisible, setDelayCardVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setDrainageWidth(65);
    setDrainageLabel('In Progress');
    setShowDelta(false);
    setShowDelayCard(false);
    setDelayCardVisible(false);
    setFadeOut(false);

    const t1 = setTimeout(() => {
      setDrainageWidth(78);
      setDrainageLabel('On Track ↑');
      setShowDelta(true);
    }, 1700);

    const t2 = setTimeout(() => setShowDelayCard(true), 3400);
    const t2b = setTimeout(() => setDelayCardVisible(true), 3480);

    const t3 = setTimeout(() => setFadeOut(true), 5200);
    const t4 = setTimeout(() => setCycle(c => c + 1), 5800);

    return () => [t1, t2, t2b, t3, t4].forEach(clearTimeout);
  }, [cycle]);

  return (
    <div
      className={`bg-zinc-950 rounded-2xl border border-amber-500/20 shadow-[0_0_0_1px_rgba(245,158,11,0.06)] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="bg-zinc-900 rounded-t-2xl px-4 py-3 flex items-center gap-2 border-b border-amber-500/10">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
        <span className="ml-2 text-xs text-zinc-400 font-medium">Programme Controls</span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-amber-300/90">
          SitePlan
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Bulk earthworks</span>
            <span className={statusChip('Complete')}>Complete</span>
          </div>
          <div className="w-full h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full w-full bg-emerald-500 rounded-full" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Drainage install</span>
            <div className="flex items-center gap-2">
              {showDelta && (
                <span className="text-xs text-amber-300 font-bold animate-fade-in">+13%</span>
              )}
              <span className={statusChip(drainageLabel)}>{drainageLabel}</span>
            </div>
          </div>
          <div className="w-full h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${drainageWidth}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Subbase preparation</span>
            <span className={statusChip('Not Started')}>Not Started</span>
          </div>
          <div className="w-full h-6 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full bg-zinc-700 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        {showDelayCard && (
          <div
            className={`border border-amber-500/40 bg-amber-950/25 rounded-xl p-3 transition-all duration-500 ${
              delayCardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-300 text-sm font-medium">
                  Delay flagged: Concrete pour — weather hold
                </p>
                <p className="text-zinc-400 text-xs mt-0.5">Critical path impact: +2 days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
