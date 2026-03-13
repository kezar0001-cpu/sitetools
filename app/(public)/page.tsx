import Link from "next/link";
import { redirect } from "next/navigation";

interface LandingPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const resolvedSiteSlug =
    getFirstQueryValue(searchParams?.site) ??
    getFirstQueryValue(searchParams?.slug) ??
    getFirstQueryValue(searchParams?.siteSlug) ??
    getFirstQueryValue(searchParams?.site_id);

  if (resolvedSiteSlug) {
    const forwardParams = new URLSearchParams();
    forwardParams.set("site", resolvedSiteSlug);

    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (key === "site" || key === "slug" || key === "siteSlug" || key === "site_id" || value === undefined) {
          continue;
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            forwardParams.append(key, item);
          }
        } else {
          forwardParams.set(key, value);
        }
      }
    }

    redirect(`/sign-in?${forwardParams.toString()}`);
  }

  return (
    <div className="bg-slate-50 min-h-full">
      <section className="bg-white border-b border-slate-200 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full inline-block">SiteSign via Buildstate</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-4xl leading-tight">
            Faster gate sign-in. <br />
            <span className="text-amber-500">Live headcount.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl">
            Digital QR sign-in sheets for construction sites. Get an export-ready compliance record without the paperwork.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link href="/login?signup=1&intent=sitesign" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-lg transition-transform hover:scale-105 shadow-xl shadow-amber-200">
              Start SiteSign Free
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg transition-colors">
              Log In
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">QR Code Entry</h3>
              <p className="text-slate-600 text-sm">Print a single poster for your gate. Workers scan with their phone camera to sign in instantly.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Live Headcount</h3>
              <p className="text-slate-600 text-sm">See exactly who is on site right now from your dashboard. Keep track of all workers and visitors.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Export-Ready Records</h3>
              <p className="text-slate-600 text-sm">Download signed CSV, Excel, or PDF registers instantly for compliance audits or payroll.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-200 bg-slate-50 p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-slate-900 font-bold text-lg">Looking for SitePlan? Explore the broader Buildstate suite.</p>
              <p className="text-slate-600 text-sm mt-1">SiteSign is part of Buildstate. We also develop tools for planning, inspections, and civil construction delivery.</p>
            </div>
            <Link href="/siteplan" className="inline-flex px-5 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold whitespace-nowrap">
              Explore SitePlan
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
