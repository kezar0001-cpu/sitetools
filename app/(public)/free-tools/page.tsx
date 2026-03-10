import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FREE_TOOLS, getToolAccess, getToolCapability, getTopVisibleCategories, rankFreeToolsByCommercialIntent } from "@/lib/free-tools/catalog";
import { FreeToolsDirectoryClient } from "@/components/free-tools/FreeToolsDirectoryClient";

export const metadata: Metadata = {
    title: "Civil Tools Library | Buildstate",
    description:
        "Practical civil construction calculators and workflow tools. Use instant public tools without login, then move into workspace-connected tools when you need saved project delivery workflows.",
};

export default function FreeToolsPage() {
    const rankedTools = rankFreeToolsByCommercialIntent(FREE_TOOLS);
    const liveTools = rankedTools.filter((tool) => tool.status === "live");
    const comingNextTools = rankedTools.filter((tool) => tool.status === "planned" && tool.launchPriority === "next");
    const featuredTools = liveTools.filter((tool) => tool.launchPriority === "now").slice(0, 4);
    const visibleCategories = getTopVisibleCategories(liveTools, 2);
    const directoryTools = liveTools.map((tool) => ({
        slug: tool.slug,
        name: tool.name,
        shortDescription: tool.shortDescription,
        category: tool.category,
        status: tool.status,
        access: getToolAccess(tool),
        capability: getToolCapability(tool),
        launchPriority: tool.launchPriority,
        trafficPotential: tool.trafficPotential,
        keywords: tool.keywords,
    }));

    return (
        <div className="bg-slate-50 min-h-full py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <section className="rounded-2xl bg-slate-900 text-white p-7 sm:p-10 overflow-hidden">
                    <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] items-center">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-300">Civil tools library</p>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">Calculators and practical tools for civil teams in the field and office.</h1>
                            <p className="text-slate-300 mt-3 max-w-3xl">
                                Use instant tools with no login for quick checks, then move into SiteSign for attendance records or SitePlan for delivery planning in your workspace.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link href="/sitesign" className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-500">Open SiteSign</Link>
                                <Link href="/siteplan" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white">Explore SitePlan</Link>
                                <Link href="/login" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white">Log in</Link>
                            </div>
                        </div>
                        <div className="relative rounded-2xl border border-slate-700 overflow-hidden">
                            <Image src="/branding/hero-site-team.svg" alt="Civil construction crew coordinating site quantities and planning tasks" width={900} height={600} className="h-full w-full object-cover" priority />
                        </div>
                    </div>
                </section>

                <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {featuredTools.map((tool) => (
                        <Link key={tool.slug} href={`/free-tools/${tool.slug}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors">
                            <p className="text-xs uppercase tracking-widest font-bold text-amber-700">Instant use</p>
                            <p className="font-bold text-slate-900 mt-2">{tool.name}</p>
                            <p className="text-sm text-slate-600 mt-1">{tool.shortDescription}</p>
                        </Link>
                    ))}
                </section>

                <section className="grid lg:grid-cols-[1fr,2fr] gap-6">
                    <div className="space-y-4 h-fit">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                            <h2 className="text-lg font-bold text-slate-900">Tool categories</h2>
                            {visibleCategories.map((category) => (
                                <div key={category.id} className="border border-slate-200 rounded-xl p-3">
                                    <p className="text-sm font-bold text-slate-900">{category.label}</p>
                                    <p className="text-xs text-slate-600 mt-1">{category.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <Image src="/branding/hero-dashboard-summary.svg" alt="Project engineer reviewing saved quantities in a workspace dashboard" width={900} height={560} className="rounded-xl w-full h-auto" />
                        </div>
                    </div>

                    <FreeToolsDirectoryClient categories={visibleCategories} tools={directoryTools} />
                </section>

                <section className="space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Roadmap preview</p>
                        <h2 className="text-2xl font-black text-slate-900 mt-1">Coming next</h2>
                        <p className="text-sm text-slate-600 mt-1">Planned calculators with strong commercial intent that are queued after the live toolset.</p>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {comingNextTools.map((tool) => (
                            <article key={tool.slug} className="rounded-2xl border border-slate-200 bg-white p-5">
                                <p className="text-xs uppercase tracking-widest font-bold text-slate-500">{tool.category.replace("-", " ")}</p>
                                <p className="font-bold text-slate-900 mt-2">{tool.name}</p>
                                <p className="text-sm text-slate-600 mt-1">{tool.shortDescription}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
