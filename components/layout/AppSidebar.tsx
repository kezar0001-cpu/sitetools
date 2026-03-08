"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

interface SidebarContentProps {
  pathname: string;
  activeCompany: string;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, activeCompany, onNavigate }: SidebarContentProps) {
  return (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 sticky top-0 bg-slate-900 z-10">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onNavigate}>
          <div className="bg-amber-400 text-amber-900 rounded-lg p-1 transition-transform group-hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">Buildstate</span>
        </Link>
      </div>

      <div className="px-4 py-4 border-b border-slate-800">
        <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">Active Workspace</p>
        <p className="text-sm font-bold text-white mt-1 truncate">{activeCompany}</p>
      </div>

      <div className="flex-1 py-6 px-4 space-y-8">
        <div>
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
              pathname === "/dashboard" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Workspace Dashboard
          </Link>
          <Link
            href="/dashboard/team"
            onClick={onNavigate}
            className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
              pathname.startsWith("/dashboard/team") ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Team
          </Link>
          <Link
            href="/dashboard/sites"
            onClick={onNavigate}
            className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
              pathname.startsWith("/dashboard/sites") ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 10l9 4 9-4M3 12l9 4 9-4" />
            </svg>
            Sites
          </Link>
        </div>

        <div>
          <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Live Modules</h3>
          <ul className="space-y-1">
            {MODULES.filter((m) => m.status === "live").map((m) => {
              const active = pathname.startsWith(m.href);
              return (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                      active ? "bg-amber-400 text-amber-950 shadow-md font-bold" : "hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <div className={active ? "opacity-100" : "opacity-70 text-amber-400"}>{getIcon(m.icon, "h-4 w-4")}</div>
                    {m.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Planned Modules</h3>
          <ul className="space-y-1">
            {MODULES.filter((m) => m.status === "coming-soon").map((m) => (
              <li key={m.id}>
                <Link
                  href={m.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-sm ${
                    pathname.startsWith(m.href)
                      ? "bg-slate-800 text-white ring-1 ring-slate-700"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <div className="opacity-50">{getIcon(m.icon, "h-4 w-4")}</div>
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-slate-800 shrink-0 bg-slate-900">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors font-medium text-sm hover:bg-slate-800/50 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0-6v2m0 16v2m10-10h-2M4 12H2m15.364 6.364-1.414-1.414M8.05 8.05 6.636 6.636m10.728 0-1.414 1.414M8.05 15.95l-1.414 1.414" />
          </svg>
          Account
        </Link>
      </div>
    </>
  );
}

export function AppSidebar({ mobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const { summary } = useWorkspace({ requireAuth: false, requireCompany: false });
  const activeCompany = summary?.activeMembership?.companies?.name ?? "No Company";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 z-40 hidden md:flex border-r border-slate-800 shadow-xl overflow-y-auto hidden-scrollbar flex-col">
        <SidebarContent pathname={pathname} activeCompany={activeCompany} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close navigation menu" />
          <aside className="relative w-72 max-w-[90vw] h-full bg-slate-900 text-slate-300 border-r border-slate-800 shadow-xl overflow-y-auto hidden-scrollbar flex flex-col">
            <SidebarContent pathname={pathname} activeCompany={activeCompany} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
