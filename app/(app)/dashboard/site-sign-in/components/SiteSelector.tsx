"use client";

import Link from "next/link";
import type { Site } from "@/lib/workspace/types";

interface SiteSelectorProps {
  sites: Site[];
  selectedSiteId: string;
  selectedSite: Site | null;
  onSiteChange: (siteId: string) => void;
  onPrefetchSites: () => void;
}

export function SiteSelector({
  sites,
  selectedSiteId,
  selectedSite,
  onSiteChange,
  onPrefetchSites,
}: SiteSelectorProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">SiteSign</h1>
          <p className="mt-1 text-sm text-slate-600">
            QR-based site sign-in with inductions and daily briefings. Workers scan to check in; you manage records here.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Working Site</span>
            <select
              value={selectedSiteId}
              onChange={(e) => onSiteChange(e.target.value)}
              onMouseEnter={onPrefetchSites}
              className="border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white max-w-[200px] sm:max-w-[280px] truncate"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          {selectedSite && (
            <Link
              href={`/print-qr/${selectedSite.slug}`}
              className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              Print QR Code
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
