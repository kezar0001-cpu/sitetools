'use client';

import { useEffect, useState } from 'react';

const DIARY_TEXT =
  'DATE: 10 Apr 2026\nWEATHER: Fine, light wind 12°C\nWORK COMPLETED: Earthworks to RL 47.2m\nCREW ON SITE: 12\nNOTES: Concrete pour delayed — pump unavailable';

export default function SiteCaptureDemo() {
  const [displayText, setDisplayText] = useState('');
  const [cursorOn, setCursorOn] = useState(true);
  const [btnVisible, setBtnVisible] = useState([false, false, false]);
  const [pulsePDF, setPulsePDF] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastSlideIn, setToastSlideIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setDisplayText('');
    setCursorOn(true);
    setBtnVisible([false, false, false]);
    setPulsePDF(false);
    setShowToast(false);
    setToastSlideIn(false);
    setFadeOut(false);

    let charIndex = 0;

    const typingTimer = setInterval(() => {
      if (charIndex < DIARY_TEXT.length) {
        charIndex += 1;
        setDisplayText(DIARY_TEXT.slice(0, charIndex));
      } else {
        clearInterval(typingTimer);

        setTimeout(() => {
          setTimeout(() => setBtnVisible([true, false, false]), 60);
          setTimeout(() => setBtnVisible([true, true, false]), 220);
          setTimeout(() => setBtnVisible([true, true, true]), 380);
        }, 260);

        setTimeout(() => setPulsePDF(true), 1100);

        setTimeout(() => {
          setShowToast(true);
          setTimeout(() => setToastSlideIn(true), 50);
        }, 1850);

        setTimeout(() => setFadeOut(true), 3600);
        setTimeout(() => setCycle(c => c + 1), 4200);
      }
    }, 34);

    const cursorTimer = setInterval(() => setCursorOn(v => !v), 520);

    return () => {
      clearInterval(typingTimer);
      clearInterval(cursorTimer);
    };
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
        <span className="ml-2 text-xs text-zinc-400 font-medium">Site Diary Capture</span>
      </div>

      {showToast && (
        <div
          className={`absolute top-14 right-4 bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs px-3 py-2 rounded-lg z-10 whitespace-nowrap transition-all duration-300 ${
            toastSlideIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          ✓ Daily diary exported — 10 Apr 2026
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 font-mono text-sm text-zinc-200 min-h-[150px] whitespace-pre-wrap leading-relaxed">
          {displayText}
          <span
            className={`transition-opacity duration-100 ${cursorOn ? 'opacity-100' : 'opacity-0'}`}
          >
            |
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-300 ${
              pulsePDF
                ? 'animate-pulse-amber bg-amber-500/20 text-amber-300 border-amber-500/60'
                : 'bg-zinc-900 text-amber-300 border-zinc-700'
            } ${btnVisible[0] ? 'opacity-100' : 'opacity-0'}`}
          >
            <span>📄</span> Export PDF
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-700 transition-opacity duration-300 ${
              btnVisible[1] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span>📊</span> Export CSV
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-900 text-emerald-400 border border-zinc-700 transition-opacity duration-300 ${
              btnVisible[2] ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span>📗</span> Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
