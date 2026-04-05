"use client";

import { CheckSquare, ListTodo, BarChart3 } from "lucide-react";
import type { MobileTab } from "./SitePlanMobileView";

interface SitePlanBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function SitePlanBottomNav({ activeTab, onTabChange }: SitePlanBottomNavProps) {
  const mobileTabs: readonly MobileTab[] = ["today", "all", "gantt"];
  const tabLabels = ["Today", "All Tasks", "Gantt"] as const;
  const tabIcons = [CheckSquare, ListTodo, BarChart3] as const;
  const tabs = mobileTabs.map((id, index) => ({
    id,
    label: tabLabels[index],
    icon: tabIcons[index],
  }));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] gap-0.5 transition-colors ${
                active
                  ? "text-blue-600"
                  : "text-slate-400 active:text-slate-600"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
