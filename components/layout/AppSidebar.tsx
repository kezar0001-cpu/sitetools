"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getPrimaryNavModules, getSecondaryNavModules, getRoadmapModules } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";
import { setActiveCompany } from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { CompanyMembership } from "@/lib/workspace/types";
import { toast } from "sonner";

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

interface SidebarContentProps {
  pathname: string;
  activeCompany: string;
  activeCompanyId: string;
  memberships: CompanyMembership[];
  switching: boolean;
  onCompanySwitch: (companyId: string) => void;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, activeCompany, activeCompanyId, memberships, switching, onCompanySwitch, onNavigate }: SidebarContentProps) {
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
        {memberships.length > 1 ? (
          <div className="relative mt-1.5">
            <select
              value={activeCompanyId}
              onChange={(e) => onCompanySwitch(e.target.value)}
              disabled={switching}
              className={`w-full bg-slate-800 border border-slate-700 text-white text-sm font-semibold rounded-lg pl-2.5 pr-8 py-1.5 appearance-none cursor-pointer transition-colors ${
                switching ? "opacity-50 cursor-wait" : "hover:border-amber-500/60"
              }`}
            >
              {memberships.map((m) => (
                <option key={m.company_id} value={m.company_id}>
                  {m.companies?.name ?? "Untitled Company"}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              {switching ? (
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm font-bold text-white mt-1 truncate">{activeCompany}</p>
        )}
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
            href="/dashboard/sites"
            onClick={onNavigate}
            className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
              pathname.startsWith("/dashboard/sites") || pathname === "/dashboard/projects" ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" : "hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Projects
          </Link>
        </div>

        <div>
          <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Live Modules</h3>
          <ul className="space-y-1">
            {getPrimaryNavModules().map((m) => {
              const active = pathname.startsWith(m.href);
              return (
                <li key={m.id}>
                  {m.status === "live" ? (
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
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-500 cursor-not-allowed opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="opacity-50">{getIcon(m.icon, "h-4 w-4")}</div>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Soon</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <details className="group">
          <summary className="cursor-pointer list-none px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between hover:text-slate-300">
            <span>Explore Other Tools</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="pt-2 space-y-6">
            <ul className="space-y-1">
              {getSecondaryNavModules().map((m) => {
                const active = pathname.startsWith(m.href);
                return (
                  <li key={m.id}>
                    {m.status === "live" ? (
                      <Link
                        href={m.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                          active ? "bg-slate-800 text-white shadow-md font-bold" : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                        }`}
                      >
                        <div className={active ? "opacity-100" : "opacity-70"}>{getIcon(m.icon, "h-4 w-4")}</div>
                        {m.name}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-500 cursor-not-allowed opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="opacity-50">{getIcon(m.icon, "h-4 w-4")}</div>
                          <span className="text-sm font-medium">{m.name}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Soon</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div>
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">Planned Modules</h3>
              <ul className="space-y-1">
                {getRoadmapModules().map((m) => (
                  <li key={m.id}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-500 cursor-not-allowed opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="opacity-50">{getIcon(m.icon, "h-4 w-4")}</div>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Soon</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
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
  const router = useRouter();
  const { summary, refresh } = useWorkspace({ requireAuth: false, requireCompany: false });
  const [switching, setSwitching] = useState(false);

  const activeCompany = summary?.activeMembership?.companies?.name ?? "No Company";
  const activeCompanyId = summary?.activeMembership?.company_id ?? "";
  const memberships = summary?.memberships ?? [];

  async function handleCompanySwitch(companyId: string) {
    if (!companyId || companyId === activeCompanyId) return;
    setSwitching(true);
    const targetName = memberships.find((m) => m.company_id === companyId)?.companies?.name ?? "Company";
    try {
      await setActiveCompany(companyId, summary?.userId, activeCompanyId);
      await refresh();
      toast.success(`Switched to ${targetName}`);
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 300);
    } catch {
      toast.error("Failed to switch workspace. Please try again.");
    } finally {
      setSwitching(false);
    }
  }

  const sharedProps = {
    pathname,
    activeCompany,
    activeCompanyId,
    memberships,
    switching,
    onCompanySwitch: handleCompanySwitch,
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 z-40 hidden md:flex border-r border-slate-800 shadow-xl overflow-y-auto hidden-scrollbar flex-col">
        <SidebarContent {...sharedProps} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close navigation menu" />
          <aside className="relative w-72 max-w-[90vw] h-full bg-slate-900 text-slate-300 border-r border-slate-800 shadow-xl overflow-y-auto hidden-scrollbar flex flex-col">
            <SidebarContent {...sharedProps} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
