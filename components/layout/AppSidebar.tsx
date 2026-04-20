"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getInternalNavModules,
  getPrimaryNavModules,
  getSecondaryNavModules,
} from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

interface SidebarContentProps {
  pathname: string;
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

      {/* Main nav */}
      <div className="flex-1 py-4 space-y-6 overflow-y-auto">
        {/* Workspace */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-5 py-2">
            Workspace
          </h3>
          <ul className="space-y-0.5">
            {internalModules.map((m) => {
              // Dashboard should only be active on exact match, others use startsWith
              const active =
                m.id === "dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(m.href) ||
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

        {/* Site Tools — all modules in one section */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-5 py-2">
            Site Tools
          </h3>
          <ul className="space-y-0.5">
            {[...getPrimaryNavModules(), ...getSecondaryNavModules()].map((m) => {
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
      </div>

    </>
  );
}

export function AppSidebar({ mobileOpen, onClose }: Props) {
  const pathname = usePathname();
  const sharedProps = {
    pathname,
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
