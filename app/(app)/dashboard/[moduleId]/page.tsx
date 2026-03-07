import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";

export default function PlannedModulePage({ params }: { params: { moduleId: string } }) {
    const moduleItem = getModule(params.moduleId);

    if (!moduleItem) {
        notFound();
    }

    if (moduleItem.status === "live") {
        notFound();
    }

    return (
        <div className="max-w-3xl mx-auto p-6 md:p-10">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 space-y-5 shadow-sm">
                <p className="text-xs uppercase tracking-widest font-bold text-amber-700">Coming soon module</p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{moduleItem.name}</h1>
                <p className="text-slate-600">{moduleItem.description}</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                    This module is on the Buildstate roadmap and not active yet. You can continue using Site Sign In today.
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/dashboard/site-sign-in" className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-black">
                        Open Site Sign In
                    </Link>
                    <Link href="/dashboard" className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
