import Image from "next/image";
import Link from "next/link";
import { ToolCalculator } from "@/components/free-tools/ToolCalculator";
import { getRelatedTools, getToolAccess } from "@/lib/free-tools/catalog";
import { FreeTool } from "@/lib/free-tools/types";
import { getModule } from "@/lib/modules";

interface ToolPageLayoutProps {
    tool: FreeTool;
}

const CATEGORY_UPGRADE_REASONS: Partial<Record<FreeTool["category"], string>> = {
    "quantity-volume": "Roll repeated quantity checks into a single project workspace so teams stop rekeying numbers.",
    materials: "Tie material estimates to delivery planning and keep ordering decisions visible for the whole crew.",
    reinforcement: "Capture reinforcement assumptions once and keep handover-ready records with your project documents.",
    earthworks: "Track changing site conditions against your plan so excavation and backfill decisions are auditable.",
    "geometry-setout": "Store setout and alignment decisions with field records so supervisors can verify work quickly.",
    estimating: "Move early pricing into a traceable workflow before rates and assumptions drift.",
    conversions: "Standardised conversions reduce avoidable mistakes when multiple teams share measurements.",
    productivity: "Turn quick labour calculations into consistent crew records, cost visibility, and better forecasting.",
};

const getModuleUpgradeReasons = (tool: FreeTool): string[] => {
    const reasons: string[] = [];
    const categoryReason = CATEGORY_UPGRADE_REASONS[tool.category];

    if (categoryReason) {
        reasons.push(categoryReason);
    }

    if (tool.funnelTarget) {
        reasons.push(tool.funnelTarget);
    }

    return reasons.slice(0, 3);
};

export function ToolPageLayout({ tool }: ToolPageLayoutProps) {
    const relatedTools = getRelatedTools(tool);
    const access = getToolAccess(tool);
    const primaryModule = getModule(tool.primaryWorkspaceModuleId);
    const loginHref = `/login?signup=1&module=${tool.primaryWorkspaceModuleId}&source=free-tool&tool=${tool.slug}`;
    const moduleHref = `/tools/${tool.primaryWorkspaceModuleId}?source=free-tool&tool=${tool.slug}`;
    const moduleUpgradeReasons = getModuleUpgradeReasons(tool);

    return (
        <div className="bg-slate-50 min-h-full py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <Link href="/free-tools" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to tools library</Link>

                <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Civil calculator</p>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tool.status === "planned" ? "bg-slate-100 text-slate-700" : access === "public" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                            {tool.status === "planned" ? "Planned" : access === "public" ? "Public" : "Workspace"}
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">{tool.name}</h1>
                    <p className="text-slate-700 text-lg max-w-3xl">{tool.longDescription}</p>
                </section>

                {tool.calculator ? (
                    <ToolCalculator toolSlug={tool.slug} />
                ) : (
                    <section className="rounded-2xl border border-slate-200 bg-white p-6">
                        <p className="font-semibold text-slate-900">This tool is planned for the next release wave.</p>
                        <p className="text-sm text-slate-600 mt-1">We are shipping high-use civil calculations first, then expanding with workspace-connected workflows and advanced estimating capabilities.</p>
                    </section>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">How this tool works</h2>
                        <p className="text-sm text-slate-600">Results are instant and based on the values you provide. Validate outputs against drawings, specifications, and project controls before procurement or construction.</p>

                        {tool.assumptions?.length ? (
                            <div>
                                <h3 className="font-semibold text-slate-900">Assumptions</h3>
                                <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 space-y-1">
                                    {tool.assumptions.map((assumption) => (
                                        <li key={assumption}>{assumption}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {tool.notes?.length ? (
                            <div>
                                <h3 className="font-semibold text-slate-900">Practical notes</h3>
                                <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 space-y-1">
                                    {tool.notes.map((note) => (
                                        <li key={note}>{note}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {tool.example ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                <p className="font-bold">Example calculation</p>
                                <p className="mt-1">{tool.example}</p>
                            </div>
                        ) : null}
                    </section>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <p className="text-sm font-bold text-slate-900">Take this calculation into {primaryModule?.name ?? "your workspace"}</p>
                            <p className="text-sm text-slate-600 mt-1">Use module-linked tools to save calculations, tie them to live project records, and move from estimate to action.</p>
                            {moduleUpgradeReasons.length ? (
                                <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                                    {moduleUpgradeReasons.map((reason) => (
                                        <li key={reason}>{reason}</li>
                                    ))}
                                </ul>
                            ) : null}
                            <div className="mt-4 space-y-2">
                                <Link href={moduleHref} className="block text-center rounded-xl border border-slate-300 text-slate-700 font-bold text-sm px-4 py-2.5 hover:border-slate-400">
                                    Explore {primaryModule?.name ?? "workspace module"}
                                </Link>
                                <Link href={loginHref} className="block text-center rounded-xl bg-slate-900 text-white font-bold text-sm px-4 py-2.5 hover:bg-black">
                                    Sign up and continue in {primaryModule?.name ?? "workspace"}
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                            <Image src="/branding/hero-qr-checkin.svg" alt="Supervisor using mobile workflows on a live civil construction site" width={800} height={500} className="rounded-xl w-full h-auto" />
                            <p className="px-1 text-xs text-slate-500">Representative civil workflow imagery for the public tools experience.</p>
                        </div>
                    </aside>
                </div>

                {relatedTools.length ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Related tools</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {relatedTools.map((related) => (
                                <Link key={related.slug} href={`/free-tools/${related.slug}`} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
                                    <p className="font-semibold text-slate-900 text-sm">{related.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{related.shortDescription}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    );
}
