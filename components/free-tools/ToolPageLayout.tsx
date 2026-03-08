import Link from "next/link";
import { FreeTool } from "@/lib/free-tools/types";
import { ToolCalculator } from "@/components/free-tools/ToolCalculator";
import { getRelatedTools } from "@/lib/free-tools/catalog";

interface ToolPageLayoutProps {
    tool: FreeTool;
}

export function ToolPageLayout({ tool }: ToolPageLayoutProps) {
    const relatedTools = getRelatedTools(tool);

    return (
        <div className="bg-slate-50 min-h-full py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <Link href="/free-tools" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to Free Tools</Link>

                <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Buildstate Free Tool</p>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">{tool.name}</h1>
                    <p className="text-slate-700 text-lg max-w-3xl">{tool.longDescription}</p>
                </section>

                {tool.calculator ? (
                    <ToolCalculator toolSlug={tool.slug} />
                ) : (
                    <section className="rounded-2xl border border-slate-200 bg-white p-6">
                        <p className="font-semibold text-slate-900">This tool is on the Buildstate roadmap.</p>
                        <p className="text-sm text-slate-600 mt-1">We are currently prioritising high-impact calculators first and will release this one in a future batch.</p>
                    </section>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">How this calculator works</h2>
                        <p className="text-sm text-slate-600">Results are instant and based on the inputs you provide. Always validate outputs against project drawings and specifications before procurement or construction.</p>

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
                            <p className="text-sm font-bold text-slate-900">Use this on real projects</p>
                            <p className="text-sm text-slate-600 mt-1">Save calculations and quantities inside your Buildstate workspace.</p>
                            <div className="mt-3 space-y-2">
                                <Link href="/login?signup=1" className="block text-center rounded-xl bg-slate-900 text-white font-bold text-sm px-4 py-2.5 hover:bg-black">Save this in Buildstate</Link>
                                <Link href="/tools" className="block text-center rounded-xl border border-slate-300 text-slate-700 font-bold text-sm px-4 py-2.5 hover:border-slate-400">Explore advanced modules</Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
                            <p className="text-xs uppercase font-bold tracking-[0.2em] text-slate-500">Ad slot</p>
                            <p className="text-sm text-slate-600 mt-2">Reserved for future ad-supported monetization on public free-tool pages only.</p>
                        </div>
                    </aside>
                </div>

                {relatedTools.length ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Related free tools</h2>
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
