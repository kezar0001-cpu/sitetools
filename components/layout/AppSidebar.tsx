"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-40 hidden md:flex border-r border-slate-800 shadow-xl overflow-y-auto hidden-scrollbar">
            {/* App Logo */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 sticky top-0 bg-slate-900 z-10">
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                    <div className="bg-amber-400 text-amber-900 rounded-lg p-1 transition-transform group-hover:scale-105">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-white">Buildstate</span>
                </Link>
            </div>

            {/* Nav Content */}
            <div className="flex-1 py-6 px-4 space-y-8">
                <div>
                    <Link
                        href="/dashboard"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${pathname === "/dashboard"
                                ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700"
                                : "hover:bg-slate-800/50 hover:text-white"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Module Dashboard
                    </Link>
                </div>

                <div>
                    <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Live Tools</h3>
                    <ul className="space-y-1">
                        {MODULES.filter((m) => m.status === "live").map((m) => {
                            const active = pathname.startsWith(m.href);
                            return (
                                <li key={m.id}>
                                    <Link
                                        href={m.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${active
                                                ? "bg-amber-400 text-amber-950 shadow-md font-bold"
                                                : "hover:bg-slate-800/50 hover:text-white"
                                            }`}
                                    >
                                        <div className={active ? "opacity-100" : "opacity-70 text-amber-400"}>
                                            {getIcon(m.icon, "h-4 w-4")}
                                        </div>
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
                        {MODULES.filter((m) => m.status === "coming-soon").map((m) => {
                            const active = pathname.startsWith(m.href);
                            return (
                                <li key={m.id}>
                                    <Link
                                        href={m.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-sm ${active
                                                ? "bg-slate-800 text-white ring-1 ring-slate-700"
                                                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                                            }`}
                                    >
                                        <div className="opacity-50">
                                            {getIcon(m.icon, "h-4 w-4")}
                                        </div>
                                        {m.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* Footer / User Auth */}
            <div className="px-4 py-4 border-t border-slate-800 space-y-1 shrink-0 bg-slate-900 sticky bottom-0 z-10">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors font-medium text-sm hover:bg-slate-800/50 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                </Link>
            </div>

        </aside>
    );
}
