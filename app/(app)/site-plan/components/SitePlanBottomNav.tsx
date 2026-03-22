"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ListTodo, BarChart3 } from "lucide-react";

interface SitePlanBottomNavProps {
  projectId: string;
}

export function SitePlanBottomNav({ projectId }: SitePlanBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // "timeline" view param means the Gantt/timeline tab is active
  const isTimeline = searchParams.get("view") === "timeline";
  // Treat /gantt path (legacy redirect) or view=timeline as gantt tab active
  const activeTab = isTimeline || pathname.includes("/gantt") ? "gantt" : "plan";

  const tabs = [
    {
      id: "plan",
      label: "Plan",
      icon: ListTodo,
      href: `/site-plan/${projectId}`,
    },
    {
      id: "gantt",
      label: "Gantt",
      icon: BarChart3,
      href: `/site-plan/${projectId}?view=timeline`,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ id, label, icon: Icon, href }) => {
          const active = id === activeTab;
          return (
            <Link
              key={id}
              href={href}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
