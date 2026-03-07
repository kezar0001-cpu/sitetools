"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MODULES } from "@/lib/modules";
import { ModuleCard } from "@/components/modules/ModuleCard";

export default function DashboardHome() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                window.location.href = "/login";
            } else {
                setLoading(false);
            }
        });
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    const liveModules = MODULES.filter((m) => m.status === "live");
    const plannedModules = MODULES.filter((m) => m.status === "coming-soon");

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
            <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 40V0H40V40z" fill="none" stroke="currentColor" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
                        Welcome to Buildstate
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl leading-relaxed">
                        Your central hub for managing site compliance, quality, and attendance. Select an active module below to get started.
                    </p>
                </div>
            </div>

            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Modules</h2>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">Ready to use</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveModules.map((m) => (
                        <ModuleCard key={m.id} module={m} />
                    ))}
                </div>
            </section>

            <section className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Coming Soon</h2>
                        <p className="text-slate-500 font-medium text-sm">Modules currently in development for the platform suite.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {plannedModules.map((m) => (
                        <ModuleCard key={m.id} module={m} />
                    ))}
                </div>
            </section>
        </div>
    );
}
