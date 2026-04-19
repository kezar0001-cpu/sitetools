"use client";

import { type FormType } from "@/lib/site-capture/types";

type FilterTab = "all" | FormType;

interface FilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts?: Record<"all" | "daily-diary" | "prestart-checklist", number>;
}

const TAB_CONFIG: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "daily-diary", label: "Daily Diary" },
  { id: "prestart-checklist", label: "Prestart" },
];

export function FilterTabs({ activeTab, onTabChange, counts }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = (tab.id === 'all' || tab.id === 'daily-diary' || tab.id === 'prestart-checklist') 
          ? (counts?.[tab.id] ?? 0) 
          : 0;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-amber-400 text-slate-900 shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? "bg-slate-900/10" : "bg-slate-100 text-slate-600"
                }`}>
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
