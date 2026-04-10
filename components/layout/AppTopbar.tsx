"use client";

import { useMemo } from "react";
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

  const userEmail = summary?.profile?.email ?? null;

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

        {/* Notification bell */}
        <button className="relative p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
        </button>

        {/* User avatar + email */}
        {userEmail && (
          <div className="hidden sm:flex items-center gap-2 text-sm ml-1">
            <div className="w-8 h-8 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center font-bold ring-2 ring-amber-400/30 shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="text-zinc-400 font-medium max-w-[180px] lg:max-w-[220px] truncate hidden lg:block">
              {userEmail}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="text-sm font-bold text-zinc-400 hover:text-red-400 transition-colors bg-zinc-900 hover:bg-red-950/50 border border-zinc-700 hover:border-red-800/50 rounded-lg px-3 py-1.5"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
