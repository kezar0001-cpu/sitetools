"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

interface Props {
  onMenuToggle: () => void;
}

export function AppTopbar({ onMenuToggle }: Props) {
  const pathname = usePathname();
  const { summary } = useWorkspace({ requireAuth: false, requireCompany: false });
  const [menuOpen, setMenuOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const moduleId = segments[1];
  const isDashboardHome = pathname === "/dashboard";

  const { title, icon } = useMemo(() => {
    if (isDashboardHome) {
      return {
        title: "Company Dashboard",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        ),
      };
    }

    if (pathname.startsWith("/dashboard/team")) {
      return {
        title: "Team",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
      };
    }

    if (pathname.startsWith("/dashboard/sites")) {
      return {
        title: "Locations",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7l9-4 9 4-9 4-9-4zm0 10l9 4 9-4M3 12l9 4 9-4"
            />
          </svg>
        ),
      };
    }

    if (!moduleId) {
      return { title: "Buildstate", icon: null };
    }

    const currentModule = getModule(moduleId);
    if (!currentModule) {
      return { title: "Buildstate", icon: null };
    }

    return {
      title: currentModule.name,
      icon: getIcon(currentModule.icon, "h-5 w-5 text-amber-400"),
    };
  }, [isDashboardHome, moduleId, pathname]);

  const profile = summary?.profile ?? null;
  const userEmail = profile?.email ?? null;
  const displayName = profile?.full_name?.trim() || userEmail?.split("@")[0] || "Buildstate User";
  const activeCompanyName = summary?.activeMembership?.companies?.name ?? null;
  const membershipCount = summary?.memberships?.length ?? 0;
  const avatarLabel = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "B";

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shrink-0">
      {/* Left: menu toggle + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: search, notifications, user, logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 w-44 lg:w-60">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-zinc-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none w-full"
          />
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left hover:bg-zinc-800/70 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="w-9 h-9 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center font-black ring-2 ring-amber-400/20 shrink-0">
              {avatarLabel}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate max-w-[180px]">
                {displayName}
              </p>
              <p className="text-xs text-zinc-500 truncate max-w-[180px]">
                {activeCompanyName ?? userEmail ?? "Account"}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`hidden sm:block h-4 w-4 text-zinc-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 overflow-hidden z-50">
              <div className="px-4 py-4 border-b border-zinc-800 bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center text-sm font-black ring-2 ring-amber-400/20 shrink-0">
                    {avatarLabel}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">{displayName}</p>
                    {userEmail && <p className="text-xs text-zinc-500 truncate">{userEmail}</p>}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Workspace</p>
                  <p className="text-sm font-semibold text-zinc-100 mt-1 truncate">
                    {activeCompanyName ?? "No active company"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {membershipCount > 1 ? `${membershipCount} workspaces available` : "Single workspace account"}
                  </p>
                </div>
              </div>

              <div className="p-2 space-y-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
                >
                  <span>Profile & settings</span>
                  <span className="text-zinc-600">→</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors"
                >
                  <span>Logout</span>
                  <span className="text-red-500">↗</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
