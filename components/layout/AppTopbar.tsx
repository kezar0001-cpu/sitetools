"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { getModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";

export function AppTopbar() {
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserEmail(user?.email || null);
        });
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    // Determine active module name for the header
    const segments = pathname.split("/").filter(Boolean);
    const moduleId = segments[1]; // /dashboard/[moduleId]
    const isDashboardHome = pathname === "/dashboard";

    let headerTitle = "Buildstate";
    let headerIcon = null;

    if (isDashboardHome) {
        headerTitle = "Module Dashboard";
        headerIcon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
        );
    } else if (moduleId) {
        const activeModule = getModule(moduleId);
        if (activeModule) {
            headerTitle = activeModule.name;
            headerIcon = getIcon(activeModule.icon, "h-5 w-5 text-amber-500");
        }
    }

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
                {/* Mobile menu button (future) */}
                <button className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div className="flex items-center gap-2">
                    {headerIcon}
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">{headerTitle}</h1>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {userEmail && (
                    <div className="hidden sm:flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold border border-amber-200">
                            {userEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-600 font-medium">{userEmail}</span>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}
