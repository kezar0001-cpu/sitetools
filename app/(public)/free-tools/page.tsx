import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FREE_TOOL_CATEGORIES, FREE_TOOLS, getToolAccess, getToolCapability } from "@/lib/free-tools/catalog";
import { FreeToolsDirectoryClient } from "@/components/free-tools/FreeToolsDirectoryClient";

export const metadata: Metadata = {
    title: "Civil Tools Library | Buildstate",
    description:
        "Practical civil construction calculators and workflow tools. Use instant public tools without login, then move into workspace-connected tools when you need saved project delivery workflows.",
};

export default function FreeToolsPage() {
    const featuredTools = FREE_TOOLS.filter((tool) => tool.status === "live" && tool.launchPriority === "now").slice(0, 4);
    const directoryTools = FREE_TOOLS.map((tool) => ({
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
                                Use instant tools with no login for quick checks. Move into workspace tools when you need saved data, connected projects and sites, team collaboration, and advanced capability where required.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link href="/free-tools/concrete-volume-calculator" className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-500">Open instant tools</Link>
                                <Link href="/tools" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white">View workspace tools</Link>
                                <Link href="/login?signup=1" className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-white">Create account</Link>
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
                            {FREE_TOOL_CATEGORIES.map((category) => (
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

                    <FreeToolsDirectoryClient categories={FREE_TOOL_CATEGORIES} tools={directoryTools} />
                </section>
            </div>
        </div>
    );
}
