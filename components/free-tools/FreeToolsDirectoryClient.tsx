"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FreeToolCategory, ToolAccess, ToolCapability } from "@/lib/free-tools/types";

interface FreeToolCardItem {
    slug: string;
    name: string;
    shortDescription: string;
    category: string;
    status: "live" | "planned";
    access: ToolAccess;
    capability: ToolCapability;
    launchPriority: "now" | "next" | "later";
    trafficPotential: "high" | "medium" | "niche";
    keywords: string[];
}

interface FreeToolsDirectoryClientProps {
    categories: FreeToolCategory[];
    tools: FreeToolCardItem[];
}

export function FreeToolsDirectoryClient({ categories, tools }: FreeToolsDirectoryClientProps) {
    const [query, setQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");

    const filteredTools = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        return tools.filter((tool) => {
            const categoryMatch = activeCategory === "all" || tool.category === activeCategory;
            const queryMatch =
                !normalized ||
                tool.name.toLowerCase().includes(normalized) ||
                tool.shortDescription.toLowerCase().includes(normalized) ||
                tool.keywords.some((keyword) => keyword.toLowerCase().includes(normalized));

            return categoryMatch && queryMatch;
        });
    }, [activeCategory, query, tools]);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search calculators and tools (e.g. concrete, trench, asphalt)"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${activeCategory === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300"}`}
                        onClick={() => setActiveCategory("all")}
                    >
                        All categories
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${activeCategory === category.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300"}`}
                            onClick={() => setActiveCategory(category.id)}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTools.map((tool) => (
                    <article key={tool.slug} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">{tool.category.replace("-", " ")}</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${tool.status === "planned" ? "bg-slate-100 text-slate-700" : tool.access === "public" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                                    {tool.status === "planned" ? "Planned" : tool.access === "public" ? "Public" : "Workspace"}
                                </span>
                                {tool.capability === "advanced" && tool.status !== "planned" ? (
                                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">Advanced</span>
                                ) : null}
                            </div>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">{tool.name}</h2>
                        <p className="text-sm text-slate-600 flex-grow">{tool.shortDescription}</p>
                        <div className="text-xs text-slate-500">{tool.status === "planned" ? "Roadmap" : tool.access === "public" ? "No login required" : "Login required for saved workflows"}</div>
                        <Link href={`/free-tools/${tool.slug}`} className="mt-1 inline-flex justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:border-slate-400">
                            {tool.status === "live" ? (tool.access === "public" ? "Open tool" : "Use in workspace") : "View roadmap"}
                        </Link>
                    </article>
                ))}
            </div>
        </div>
    );
}
