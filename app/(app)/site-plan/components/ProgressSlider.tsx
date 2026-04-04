"use client";

import { useState, useCallback } from "react";

interface ProgressSliderProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function ProgressSlider({
  value,
  onChange,
  disabled = false,
  size = "md",
}: ProgressSliderProps) {
  const [local, setLocal] = useState(value);
  const [dragging, setDragging] = useState(false);

  const commit = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(v)));
      setLocal(clamped);
      onChange(clamped);
      setDragging(false);
    },
    [onChange]
  );

  const height = size === "sm" ? "h-6" : "h-10";
  const thumbSize = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={`relative flex-1 ${height} flex items-center`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={dragging ? local : value}
          disabled={disabled}
          onChange={(e) => {
            setLocal(Number(e.target.value));
            setDragging(true);
          }}
          onMouseUp={(e) =>
            commit(Number((e.target as HTMLInputElement).value))
          }
          onTouchEnd={(e) =>
            commit(Number((e.target as HTMLInputElement).value))
          }
          className={`h-11 w-full cursor-pointer accent-blue-600 ${height} ${thumbSize}`}
          style={{ touchAction: "none" }}
        />
      </div>
      <span
        className={`${textSize} font-semibold text-slate-700 tabular-nums w-10 text-right`}
      >
        {dragging ? local : value}%
      </span>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const color =
    value >= 100
      ? "bg-green-500"
      : value > 0
      ? "bg-blue-500"
      : "bg-slate-200";

  return (
    <div
      className={`h-2 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}
