"use client";

import Link from "next/link";
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
                return;
            }

            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    const liveModules = MODULES.filter((module) => module.status === "live");
    const upcomingModules = MODULES.filter((module) => module.status !== "live");

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
            <section className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white border border-slate-800">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-300">Buildstate workspace</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">One dashboard for your construction software stack.</h1>
                <p className="text-slate-300 text-base md:text-lg mt-4 max-w-3xl">
                    Access live modules now and see what is planned next. Site Sign In remains your first active app, while future modules are visible as roadmap placeholders.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/dashboard/site-sign-in" className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-5 py-3 rounded-xl text-sm">
                        Open Site Sign In
                    </Link>
                    <Link href="/tools" className="border border-slate-700 hover:border-slate-500 text-white font-semibold px-5 py-3 rounded-xl text-sm">
                        View module roadmap
                    </Link>
                </div>
            </section>

            <section className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active module</h2>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">Ready now</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </section>

            <section className="space-y-5 border-t border-slate-200 pt-8">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Planned modules</h2>
                <p className="text-sm text-slate-500">These cards represent upcoming Buildstate modules and intentionally route to “coming soon” placeholders.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {upcomingModules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </section>
        </div>
    );
}
