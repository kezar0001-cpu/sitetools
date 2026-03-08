import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULES, getModule } from "@/lib/modules";
import { getIcon } from "@/components/icons/getIcon";

export function generateStaticParams() {
    return MODULES.map((module) => ({ moduleId: module.id }));
}

export default function ToolDetailPage({ params }: { params: { moduleId: string } }) {
    const moduleItem = getModule(params.moduleId);

    if (!moduleItem) {
        notFound();
    }

    const isLive = moduleItem.status === "live";

    return (
        <div className="bg-slate-50 min-h-full py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <Link href="/tools" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to workspace tools</Link>

                <section className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                                {getIcon(moduleItem.icon, "h-5 w-5")}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500">Workspace tool</p>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">{moduleItem.name}</h1>
                            </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isLive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {isLive ? "Workspace" : "Planned"}
                        </span>
                    </div>

                    <p className="text-slate-700 text-lg">{moduleItem.tagline}</p>
                    <p className="text-slate-600">{moduleItem.description}</p>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                        <h2 className="font-bold text-slate-900 mb-2">How it fits into delivery workflows</h2>
                        <p className="text-sm text-slate-600">
                            This tool is designed for workspace use, so teams can save records and keep account, organisation, project, and site context connected.
                        </p>
                    </div>

                    {isLive ? (
                        <Link href={moduleItem.href} className="inline-flex px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl">
                            Use in workspace
                        </Link>
                    ) : (
                        <Link href="/dashboard" className="inline-flex px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl">
                            View workspace overview
                        </Link>
                    )}
                </section>
            </div>
        </div>
    );
}
