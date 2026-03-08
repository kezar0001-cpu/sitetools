import Link from "next/link";
import { MODULES } from "@/lib/modules";
import { ModuleCard } from "@/components/modules/ModuleCard";

export default function ToolsPage() {
    const liveModules = MODULES.filter((module) => module.status === "live");
    const plannedModules = MODULES.filter((module) => module.status !== "live");

    return (
        <div className="bg-slate-50 min-h-full py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <section className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Workspace tools</p>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Connected workflows for project and site delivery</h1>
                    <p className="text-slate-600 max-w-3xl">
                        These tools run in your workspace so teams can save records, connect projects and sites, and coordinate delivery. Some modules are live now and others are marked clearly as planned.
                    </p>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Live workspace module</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveModules.map((module) => (
                            <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Planned modules</h2>
                    <p className="text-sm text-slate-500">Roadmap modules are visible so teams can understand where the platform is heading.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plannedModules.map((module) => (
                            <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
                        ))}
                    </div>
                </section>

                <section className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-bold">Need connected delivery workflows?</h3>
                        <p className="text-slate-300 mt-1">Start with live modules, then add advanced capabilities when your process needs them.</p>
                    </div>
                    <Link href="/login?signup=1" className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-5 py-3 rounded-xl whitespace-nowrap text-center">
                        Create account
                    </Link>
                </section>
            </div>
        </div>
    );
}
