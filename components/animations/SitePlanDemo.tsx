'use client';

import { useState, useEffect } from 'react';

type DrainageLabel = 'In Progress' | 'On Track ↑';

function statusChip(label: string) {
  const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
  if (label === 'Complete') return `${base} bg-green-900/50 text-green-400`;
  if (label === 'On Track ↑') return `${base} bg-amber-900/50 text-amber-300`;
  if (label === 'In Progress') return `${base} bg-amber-900/30 text-amber-400`;
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

    // Phase 1 at 2s: drainage bar fills, label and delta update
    const t1 = setTimeout(() => {
      setDrainageWidth(78);
      setDrainageLabel('On Track ↑');
      setShowDelta(true);
    }, 2000);

    // Phase 2 at 4s: delay flag card slides up
    const t2 = setTimeout(() => setShowDelayCard(true), 4000);
    const t2b = setTimeout(() => setDelayCardVisible(true), 4060);

    // Fade out at 5s, restart at 6s (1s pause per spec)
    const t3 = setTimeout(() => setFadeOut(true), 5000);
    const t4 = setTimeout(() => setCycle(c => c + 1), 6000);

    return () => [t1, t2, t2b, t3, t4].forEach(clearTimeout);
  }, [cycle]);

  return (
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
        <span className="ml-2 text-xs text-zinc-400 font-medium">Programme</span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Bulk earthworks — static 100% */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Bulk earthworks</span>
            <span className={statusChip('Complete')}>Complete</span>
          </div>
          <div className="w-full h-6 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-full bg-green-500 rounded-full" />
          </div>
        </div>

        {/* Drainage install — animates from 65% → 78% */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Drainage install</span>
            <div className="flex items-center gap-2">
              {showDelta && (
                <span className="text-xs text-amber-400 font-bold animate-fade-in">
                  +13%
                </span>
              )}
              <span className={statusChip(drainageLabel)}>{drainageLabel}</span>
            </div>
          </div>
          <div className="w-full h-6 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${drainageWidth}%` }}
            />
          </div>
        </div>

        {/* Subbase preparation — stays at 0% */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Subbase preparation</span>
            <span className={statusChip('Not Started')}>Not Started</span>
          </div>
          <div className="w-full h-6 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-700 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Delay flag card — slides up */}
        {showDelayCard && (
          <div
            className={`border border-amber-500/50 bg-amber-950/30 rounded-xl p-3 transition-all duration-500 ${
              delayCardVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-400 text-sm font-medium">
                  Delay flagged: Concrete pour — weather hold
                </p>
                <p className="text-zinc-400 text-xs mt-0.5">Impact: +2 days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
