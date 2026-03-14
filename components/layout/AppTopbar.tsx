"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";
import { supabase } from "@/lib/supabase";
import { setActiveCompany } from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

interface Props {
  onMenuToggle: () => void;
}

export function AppTopbar({ onMenuToggle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { summary, loading, refresh } = useWorkspace({ requireAuth: false, requireCompany: false });
  const [switching, setSwitching] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const moduleId = segments[1];
  const isDashboardHome = pathname === "/dashboard";

  const { title, icon } = useMemo(() => {
    if (isDashboardHome) {
      return {
        title: "Company Dashboard",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      };
    }

    if (pathname.startsWith("/dashboard/team")) {
      return {
        title: "Team",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      };
    }

    if (pathname.startsWith("/dashboard/sites")) {
      return {
        title: "Locations",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 10l9 4 9-4M3 12l9 4 9-4" />
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
      icon: getIcon(currentModule.icon, "h-5 w-5 text-amber-500"),
    };
  }, [isDashboardHome, moduleId, pathname]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleCompanySwitch(companyId: string) {
    if (!companyId || companyId === activeCompanyId) return;
    
    setSwitching(true);
    setToast(null);

    // Find company name for the toast
    const targetCompany = summary?.memberships.find(m => m.company_id === companyId)?.companies?.name ?? "Company";
    
    try {
      await setActiveCompany(companyId);
      await refresh();
      
      setToast({ message: `Switched to ${targetCompany}`, type: "success" });
      
      // Short delay to show success toast before redirect logic if needed, 
      // though router.replace is usually fast.
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 500);

      // Clear toast after a while
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: "Failed to switch workspace. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSwitching(false);
    }
  }

  const userEmail = summary?.profile?.email ?? null;
  const activeCompanyId = summary?.activeMembership?.company_id ?? "";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm shrink-0">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-in-from-top-2">
          <div className={`px-4 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            toast.type === "success" 
              ? "bg-emerald-500/95 border-emerald-400 text-white" 
              : "bg-red-500/95 border-red-400 text-white"
          }`}>
            {toast.type === "success" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!loading && summary && summary.memberships.length > 0 && (
          <div className="hidden lg:block relative group">
            <label className="sr-only" htmlFor="active_company">Active company</label>
            <div className="relative">
              <select
                id="active_company"
                value={activeCompanyId}
                onChange={(e) => handleCompanySwitch(e.target.value)}
                disabled={switching}
                className={`border border-slate-300 rounded-lg pl-3 pr-10 py-1.5 text-sm font-medium text-slate-700 bg-white min-w-[220px] transition-all appearance-none cursor-pointer ${
                  switching ? "opacity-50 grayscale cursor-wait" : "hover:border-amber-400 hover:ring-2 hover:ring-amber-400/10"
                }`}
              >
                {summary.memberships.map((m) => (
                  <option key={m.company_id} value={m.company_id}>
                    {m.companies?.name ?? "Untitled Company"}
                  </option>
                ))}
              </select>
              {/* Custom Arrow / Loading Icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                {switching ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {userEmail && (
          <div className="hidden sm:flex items-center gap-2 text-sm ml-2">
            <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold border border-amber-200 shadow-sm">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-600 font-medium max-w-[180px] lg:max-w-[220px] truncate">{userEmail}</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 ml-2"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
