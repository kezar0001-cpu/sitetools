"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getInternalNavModules,
  getPrimaryNavModules,
  getRoadmapModules,
  getSecondaryNavModules,
} from "@/lib/modules";
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

// base classes shared by every nav item — border-l-2 border-transparent prevents layout shift on activation
const navItemBase =
  "flex items-center gap-3 text-sm font-semibold px-3 py-2.5 rounded-r-xl mx-2 border-l-2 border-transparent transition-colors";

const inactiveNavClasses =
  "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50";

const genericActiveClasses =
  "bg-zinc-700/50 border-zinc-400 text-zinc-200";

function getModuleActiveClasses(moduleId: string): string {
  const map: Record<string, string> = {
    "site-sign-in": "bg-amber-400/10 border-amber-400 text-amber-400",
    planner:        "bg-blue-400/10 border-blue-400 text-blue-400",
    "site-capture": "bg-sky-400/10 border-sky-400 text-sky-400",
    "itp-builder":  "bg-violet-400/10 border-violet-400 text-violet-400",
    "site-docs":    "bg-cyan-400/10 border-cyan-400 text-cyan-400",
  };
  return map[moduleId] ?? genericActiveClasses;
}

function SidebarContent({
  pathname,
  activeCompany,
  activeCompanyId,
  memberships,
  switching,
  onCompanySwitch,
  onNavigate,
}: SidebarContentProps) {
  const internalModules = getInternalNavModules();

  return (
    <>
      {/* Brand bar */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800 shrink-0 sticky top-0 bg-zinc-950 z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
          onClick={onNavigate}
        >
          <div className="w-2 h-2 rounded-sm bg-amber-400 shrink-0" />
          <span className="font-black text-lg tracking-tight text-zinc-50">
            Buildstate
          </span>
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1 pb-1.5">
          Active Workspace
        </p>
        {memberships.length > 1 ? (
          <div className="relative">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
              <select
                value={activeCompanyId}
                onChange={(e) => onCompanySwitch(e.target.value)}
                disabled={switching}
                className={`w-full bg-transparent text-zinc-100 text-sm font-semibold pl-3 pr-8 py-2 appearance-none cursor-pointer ${
                  switching ? "opacity-50 cursor-wait" : ""
                }`}
              >
                {memberships.map((m) => (
                  <option
                    key={m.company_id}
                    value={m.company_id}
                    className="bg-zinc-900 text-zinc-100"
                  >
                    {m.companies?.name ?? "Untitled Company"}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                {switching ? (
                  <svg
                    className="animate-spin h-3.5 w-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">
                {activeCompany}
              </p>
              <p className="text-xs text-zinc-500">Workspace</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 text-zinc-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Main nav */}
      <div className="flex-1 py-4 space-y-6 overflow-y-auto">
        {/* Workspace */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-5 py-2">
            Workspace
          </h3>
          <ul className="space-y-0.5">
            {internalModules.map((m) => {
              const active =
                pathname.startsWith(m.href) ||
                (m.id === "sites-projects" && pathname.startsWith("/dashboard/projects"));
              return (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    onClick={onNavigate}
                    className={`${navItemBase} ${
                      active ? genericActiveClasses : inactiveNavClasses
                    }`}
                  >
                    <span className="shrink-0">{getIcon(m.icon, "h-4 w-4")}</span>
                    {m.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Live Modules */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-5 py-2">
            Live Modules
          </h3>
          <ul className="space-y-0.5">
            {getPrimaryNavModules().map((m) => {
              const active = pathname.startsWith(m.href);
              return (
                <li key={m.id}>
                  {m.status === "live" ? (
                    <Link
                      href={m.href}
                      onClick={onNavigate}
                      className={`${navItemBase} ${
                        active
                          ? getModuleActiveClasses(m.id)
                          : inactiveNavClasses
                      }`}
                    >
                      <span className="shrink-0">
                        {getIcon(m.icon, "h-4 w-4")}
                      </span>
                      {m.name}
                    </Link>
                  ) : (
                    <div
                      className={`${navItemBase} text-zinc-600 cursor-not-allowed opacity-60 justify-between`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 opacity-50">
                          {getIcon(m.icon, "h-4 w-4")}
                        </span>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 shrink-0">
                        Soon
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Explore other tools */}
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors">
            <span>Explore Other Tools</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <div className="pt-1 space-y-4">
            <ul className="space-y-0.5">
              {getSecondaryNavModules().map((m) => {
                const active = pathname.startsWith(m.href);
                return (
                  <li key={m.id}>
                    {m.status === "live" ? (
                      <Link
                        href={m.href}
                        onClick={onNavigate}
                        className={`${navItemBase} ${
                          active
                            ? getModuleActiveClasses(m.id)
                            : inactiveNavClasses
                        }`}
                      >
                        <span className="shrink-0">
                          {getIcon(m.icon, "h-4 w-4")}
                        </span>
                        {m.name}
                      </Link>
                    ) : (
                      <div
                        className={`${navItemBase} text-zinc-600 cursor-not-allowed opacity-60 justify-between`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 opacity-50">
                            {getIcon(m.icon, "h-4 w-4")}
                          </span>
                          <span className="truncate">{m.name}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 shrink-0">
                          Soon
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-5 py-2">
                Planned Modules
              </h3>
              <ul className="space-y-0.5">
                {getRoadmapModules().map((m) => (
                  <li key={m.id}>
                    <div
                      className={`${navItemBase} text-zinc-600 cursor-not-allowed opacity-60 justify-between`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 opacity-50">
                          {getIcon(m.icon, "h-4 w-4")}
                        </span>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 shrink-0">
                        Soon
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
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
    const targetName =
      memberships.find((m) => m.company_id === companyId)?.companies?.name ??
      "Company";
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
      <aside className="fixed inset-y-0 left-0 w-64 bg-zinc-950 text-zinc-400 z-40 hidden md:flex border-r border-zinc-800 overflow-y-auto hidden-scrollbar flex-col">
        <SidebarContent {...sharedProps} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-label="Close navigation menu"
          />
          <aside className="relative w-72 max-w-[90vw] h-full bg-zinc-950 text-zinc-400 border-r border-zinc-800 shadow-xl overflow-y-auto hidden-scrollbar flex flex-col">
            <SidebarContent {...sharedProps} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
