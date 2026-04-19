"use client";

import Link from "next/link";

export function ConnectedToolkitPrompt() {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zinc-100">Running smoothly?</p>
          <p className="text-sm text-zinc-500 mt-0.5">
            Add SiteITP for quality checklists and SiteDocs for professional reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/site-itp"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300 px-4 py-2 rounded-xl border border-violet-400/30 hover:border-violet-400/50 transition-colors"
          >
            SiteITP →
          </Link>
          <Link
            href="/dashboard/site-docs"
            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 px-4 py-2 rounded-xl border border-cyan-400/30 hover:border-cyan-400/50 transition-colors"
          >
            SiteDocs →
          </Link>
        </div>
      </div>
    </section>
  );
}
