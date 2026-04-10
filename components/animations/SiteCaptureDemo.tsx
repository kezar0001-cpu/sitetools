'use client';

import { useState, useEffect } from 'react';

const DIARY_TEXT =
  'DATE: 10 Apr 2026\nWEATHER: Fine, light wind 12°C\nWORK COMPLETED: Earthworks to RL 47.2m\nCREW ON SITE: 12\nNOTES: Concrete pour delayed — pump unavailable';

export default function SiteCaptureDemo() {
  const [displayText, setDisplayText] = useState('');
  const [cursorOn, setCursorOn] = useState(true);
  const [showButtons, setShowButtons] = useState(false);
  const [btnVisible, setBtnVisible] = useState([false, false, false]);
  const [pulsePDF, setPulsePDF] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastSlideIn, setToastSlideIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setDisplayText('');
    setCursorOn(true);
    setShowButtons(false);
    setBtnVisible([false, false, false]);
    setPulsePDF(false);
    setShowToast(false);
    setToastSlideIn(false);
    setFadeOut(false);

    let charIndex = 0;

    // Typing at 40ms per character
    const typingTimer = setInterval(() => {
      if (charIndex < DIARY_TEXT.length) {
        charIndex++;
        setDisplayText(DIARY_TEXT.slice(0, charIndex));
      } else {
        clearInterval(typingTimer);

        // Phase 1: staggered button fade-in
        setTimeout(() => {
          setShowButtons(true);
          setTimeout(() => setBtnVisible([true, false, false]), 50);
          setTimeout(() => setBtnVisible([true, true, false]), 200);
          setTimeout(() => setBtnVisible([true, true, true]), 350);
        }, 300);

        // Phase 2a: PDF button pulses
        setTimeout(() => setPulsePDF(true), 1200);

        // Phase 2b: toast slides in from top-right
        setTimeout(() => {
          setShowToast(true);
          setTimeout(() => setToastSlideIn(true), 50);
        }, 2000);

        // Fade out + restart (2s pause per spec)
        setTimeout(() => setFadeOut(true), 3800);
        setTimeout(() => setCycle(c => c + 1), 4300);
      }
    }, 40);

    // Blinking cursor
    const cursorTimer = setInterval(() => setCursorOn(v => !v), 530);

    return () => {
      clearInterval(typingTimer);
      clearInterval(cursorTimer);
    };
  }, [cycle]);

  return (
    <div
      className={`relative bg-zinc-900 rounded-2xl border border-zinc-700/50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Top bar */}
      <div className="bg-zinc-800 rounded-t-2xl px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-zinc-400 font-medium">Site Diary</span>
      </div>

      {/* Toast — slides down from top-right */}
      {showToast && (
        <div
          className={`absolute top-14 right-4 bg-green-900 border border-green-700 text-green-300 text-xs px-3 py-2 rounded-lg z-10 whitespace-nowrap transition-all duration-300 ${
            toastSlideIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          ✓ Daily diary exported — 10 Apr 2026
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Textarea */}
        <div className="bg-zinc-800 rounded-xl p-4 font-mono text-sm text-zinc-200 min-h-28 whitespace-pre-wrap leading-relaxed">
          {displayText}
          <span
            className={`transition-opacity duration-100 ${
              cursorOn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            |
          </span>
        </div>

        {/* Export buttons — staggered fade-in */}
        {showButtons && (
          <div className="flex gap-2 flex-wrap">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-300 ${
                pulsePDF
                  ? 'animate-pulse-amber bg-amber-500/20 text-amber-400 border-amber-500/60'
                  : 'bg-zinc-800 text-amber-400 border-zinc-700'
              } ${btnVisible[0] ? 'opacity-100' : 'opacity-0'}`}
            >
              <span>📄</span> Export PDF
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 transition-opacity duration-300 ${
                btnVisible[1] ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span>📊</span> Export CSV
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-green-400 border border-zinc-700 transition-opacity duration-300 ${
                btnVisible[2] ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span>📗</span> Export Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
