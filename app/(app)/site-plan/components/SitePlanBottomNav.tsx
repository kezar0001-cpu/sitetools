"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, BarChart3, PieChart, Settings } from "lucide-react";

interface SitePlanBottomNavProps {
  projectId: string;
}

const tabs = [
  { id: "tasks", label: "Tasks", icon: ListTodo, href: (id: string) => `/site-plan/${id}` },
  { id: "gantt", label: "Gantt", icon: BarChart3, href: (id: string) => `/site-plan/${id}/gantt` },
  { id: "summary", label: "Summary", icon: PieChart, href: (id: string) => `/site-plan/${id}/summary` },
  { id: "settings", label: "Settings", icon: Settings, href: (id: string) => `/site-plan/${id}?tab=settings` },
];

export function SitePlanBottomNav({ projectId }: SitePlanBottomNavProps) {
  const pathname = usePathname();

  const activeTab = pathname.includes("/gantt")
    ? "gantt"
    : pathname.includes("/summary")
    ? "summary"
    : "tasks";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ id, label, icon: Icon, href }) => {
          const active = id === activeTab;
          return (
            <Link
              key={id}
              href={href(projectId)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
