"use client";

import { usePathname } from "next/navigation";
import { getModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";
import Link from "next/link";

export default function ComingSoonPage() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);
    const moduleId = segments[1]; // e.g., site-capture

    const activeModule = getModule(moduleId);

    if (!activeModule) {
        return (
            <div className="p-8 text-center text-gray-500">
                Module not found.
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100 shadow-gray-200/50">
                <div className="inline-flex p-4 rounded-2xl bg-amber-100 text-amber-600 mb-6 shadow-sm border border-amber-200/50">
                    {getIcon(activeModule.icon, "h-10 w-10")}
                </div>

                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {activeModule.name}
                </h1>

                <div className="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 mb-6">
                    Planned for 2026
                </div>

                <p className="text-gray-600 leading-relaxed mb-8">
                    We&apos;re currently developing the <strong>{activeModule.name}</strong> module.
                    {activeModule.tagline.toLowerCase() && ` It will feature ${activeModule.tagline.toLowerCase()}.`}
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left mb-8 shadow-inner">
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        What to expect
                    </h3>
                    <p className="text-sm text-slate-600">
                        {activeModule.description}
                    </p>
                </div>

                <Link
                    href="/dashboard"
                    className="inline-flex w-full items-center justify-center bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-xl font-bold transition-colors shadow-sm"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
