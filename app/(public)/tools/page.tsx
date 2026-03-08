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
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Products and modules for civil delivery workflows</h1>
                    <p className="text-slate-600 max-w-3xl">
                        Buildstate is the umbrella ecosystem. SiteSign and SitePlan are the primary products, supported by additional modules on the workspace roadmap.
                    </p>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Live products</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveModules.map((module) => (
                            <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Broader roadmap modules</h2>
                    <p className="text-sm text-slate-500">Roadmap modules are visible so teams can understand where the platform is heading.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plannedModules.map((module) => (
                            <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
                        ))}
                    </div>
                </section>

                <section className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-bold">Need both attendance and planning coverage?</h3>
                        <p className="text-slate-300 mt-1">Start with SiteSign and SitePlan, then expand into additional modules as your delivery process matures.</p>
                    </div>
                    <Link href="/login?signup=1" className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-5 py-3 rounded-xl whitespace-nowrap text-center">
                        Create account
                    </Link>
                </section>
            </div>
        </div>
    );
}
