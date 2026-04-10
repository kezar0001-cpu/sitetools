'use client';

import { useState, useEffect } from 'react';

type RowStatus = 'pending' | 'pulsing' | 'complete';

const ITEMS = [
  {
    name: 'Subgrade compaction test',
    inspector: 'J. Smith — Inspector',
    time: '09:31 AM',
    isHoldPoint: false,
  },
  {
    name: 'Moisture content within spec',
    inspector: 'J. Smith — Inspector',
    time: '09:33 AM',
    isHoldPoint: false,
  },
  {
    name: 'Hold point — Principal approval',
    inspector: 'D. Chen — Principal',
    time: '09:47 AM',
    isHoldPoint: true,
  },
  {
    name: 'Witness point — Engineer sign-off',
    inspector: 'K. Nguyen — Engineer',
    time: '10:02 AM',
    isHoldPoint: false,
  },
] as const;

export default function SiteITPDemo() {
  const [statuses, setStatuses] = useState<RowStatus[]>([
    'pending',
    'pending',
    'pending',
    'pending',
  ]);
  const [showHoldBadge, setShowHoldBadge] = useState(false);
  const [holdBadgeVisible, setHoldBadgeVisible] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  const tick = (index: number) =>
    setStatuses(s => {
      const n = [...s] as RowStatus[];
      n[index] = 'complete';
      return n;
    });

  useEffect(() => {
    setStatuses(['pending', 'pending', 'pending', 'pending']);
    setShowHoldBadge(false);
    setHoldBadgeVisible(false);
    setShowBanner(false);
    setBannerVisible(false);
    setFadeOut(false);

    // Phase 1: row 0 ticks
    const t1 = setTimeout(() => tick(0), 1500);

    // Phase 2: row 1 ticks (800ms stagger)
    const t2 = setTimeout(() => tick(1), 2300);

    // Phase 3a: row 2 starts pulsing amber
    const t3 = setTimeout(
      () =>
        setStatuses(s => {
          const n = [...s] as RowStatus[];
          n[2] = 'pulsing';
          return n;
        }),
      3100,
    );

    // Phase 3b: row 2 clears after 1s pulse, hold badge slides in
    const t4 = setTimeout(() => {
      tick(2);
      setShowHoldBadge(true);
      setTimeout(() => setHoldBadgeVisible(true), 50);
    }, 4100);

    // Phase 4: row 3 ticks
    const t5 = setTimeout(() => tick(3), 4900);

    // Completion banner slides up
    const t6 = setTimeout(() => {
      setShowBanner(true);
      setTimeout(() => setBannerVisible(true), 50);
    }, 5700);

    // Fade out and restart (3s display per spec)
    const t7 = setTimeout(() => setFadeOut(true), 7500);
    const t8 = setTimeout(() => setCycle(c => c + 1), 8000);

    return () => [t1, t2, t3, t4, t5, t6, t7, t8].forEach(clearTimeout);
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
        <span className="ml-2 text-xs text-zinc-400 font-medium">ITP Checklist</span>
      </div>

      {/* Content */}
      <div className="p-5 space-y-1">
        {ITEMS.map((item, i) => {
          const status = statuses[i];
          const isComplete = status === 'complete';
          const isPulsing = status === 'pulsing';

          return (
            <div
              key={item.name}
              className={`flex items-start gap-3 px-2 py-2.5 rounded-lg transition-colors duration-500 ${
                isComplete ? 'bg-zinc-800/30' : ''
              }`}
            >
              {/* Status icon */}
              <div
                className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all duration-500 ${
                  isComplete
                    ? 'bg-green-500'
                    : isPulsing
                      ? 'animate-pulse-amber border-2 border-amber-400'
                      : 'border-2 border-zinc-600'
                }`}
              >
                {isComplete && (
                  <span className="text-white text-xs font-bold leading-none">✓</span>
                )}
                {isPulsing && (
                  <span className="text-amber-400 text-xs leading-none">🔒</span>
                )}
              </div>

              {/* Row content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm transition-colors duration-500 ${
                    isComplete
                      ? 'text-zinc-200'
                      : isPulsing
                        ? 'text-amber-300'
                        : 'text-zinc-500'
                  }`}
                >
                  {item.name}
                </p>
                {isComplete ? (
                  <p className="text-zinc-500 text-xs mt-0.5 animate-fade-in">
                    {item.inspector} · {item.time}
                  </p>
                ) : (
                  <p className="text-zinc-700 text-xs mt-0.5">Pending · —</p>
                )}
              </div>

              {/* Hold point cleared badge */}
              {item.isHoldPoint && showHoldBadge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400 font-medium shrink-0 self-center transition-all duration-500 ${
                    holdBadgeVisible
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-4'
                  }`}
                >
                  HOLD POINT CLEARED
                </span>
              )}
            </div>
          );
        })}

        {/* Completion banner */}
        {showBanner && (
          <div
            className={`mt-2 p-3 bg-green-950 border border-green-800 rounded-xl transition-all duration-500 ${
              bannerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <p className="text-green-300 text-sm font-medium text-center">
              ITP Complete ✓ — All 4 items signed off
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
