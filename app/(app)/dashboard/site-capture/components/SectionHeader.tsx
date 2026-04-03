"use client";

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: number;
}

export function SectionHeader({
  title,
  icon,
  open,
  onToggle,
  badge,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-1 py-3 text-left"
    >
      <span className="flex items-center gap-2 font-semibold text-slate-700">
        {icon}
        {title}
        {badge != null && badge > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            {badge}
          </span>
        )}
      </span>
      <svg
        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
