import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { MODULES } from "@/lib/modules";

interface LandingPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default function LandingPage({ searchParams }: LandingPageProps) {
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
  const liveModules = MODULES.filter((module) => module.status === "live");
  const upcomingModules = MODULES.filter((module) => module.status === "coming-soon").slice(0, 6);

    return (
        <>
            <section className="bg-slate-950 text-white py-20 md:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/30">
                        Live now: SiteSign
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10 items-end">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                Digital site attendance made simple,
                                <span className="text-amber-400"> with QR sign in and real-time attendance registers for every project.</span>
                            </h1>
                            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                                SiteSign is our primary live product for civil teams that need fast worker sign in/out, accurate attendance records, and instant export-ready reports.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link href="/tools/site-sign-in" className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-center transition-colors">
                                    Open SiteSign
                                </Link>
                                <Link href="/free-tools" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                                    Tools Library
                                </Link>
                                <Link href="/login" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                                    Log in
                                </Link>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <Image src="/branding/hero-site-team.svg" alt="Australian civil construction team coordinating field delivery" width={1200} height={760} className="w-full h-auto object-cover" priority />
                            <div className="p-6 space-y-3 border-t border-slate-800">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live product</p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 font-bold">SiteSign</span>
                                    <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-1 font-bold">Live module</span>
                                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 font-bold">QR + register exports</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-14 bg-white border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="max-w-3xl">
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Buildstate ecosystem</p>
                        <h2 className="text-3xl font-black text-slate-900 mt-2">Buildstate brings together focused products for civil delivery.</h2>
                        <p className="text-slate-600 mt-2">SiteSign handles attendance and gate records. SitePlan handles planning and programme control. Tools Library supports instant calculations for day-to-day field checks.</p>
                    </div>
                </div>
            </section>

            <section className="py-16 bg-slate-50 border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Core products</h2>
                        <p className="text-slate-600 mt-2">Use SiteSign for workforce attendance and SitePlan for delivery planning inside your Buildstate workspace.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                            <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">SiteSign</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">QR sign in and live attendance registers</h3>
                            <p className="text-slate-600 mt-2">Run daily worker sign in/out with export-ready attendance records for supervisors, compliance, and payroll support.</p>
                            <Link href="/tools/site-sign-in" className="inline-flex mt-4 text-sm font-bold text-amber-700 hover:text-amber-800">Open SiteSign →</Link>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                            <p className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-700">SitePlan</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">Civil planning and delivery tracking</h3>
                            <p className="text-slate-600 mt-2">Build practical programmes, monitor daily progress, and keep project delivery aligned with planned dates and milestones.</p>
                            <Link href="/tools/planner" className="inline-flex mt-4 text-sm font-bold text-indigo-700 hover:text-indigo-800">Explore SitePlan →</Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-12 bg-slate-100 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.2fr,0.8fr] gap-6 items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">From products to connected delivery records</h2>
                        <p className="text-slate-600 mt-2">SiteSign and SitePlan support daily operations, while workspace tools keep decisions tied to projects, sites, and teams.</p>
                    </div>
                    <video className="w-full rounded-2xl border border-slate-300 bg-slate-900" autoPlay loop muted playsInline poster="/branding/video-poster.svg">
                        <source src="/branding/site-operations-loop.mp4" type="video/mp4" />
                    </video>
                </div>
            </section>
            <section className="py-10 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Also part of Buildstate platform</p>
                        <p className="text-slate-700 mt-2">Explore the broader module roadmap and upcoming connected workflows.</p>
                    </div>
                    <Link href="/tools" className="text-sm font-bold text-amber-700 hover:text-amber-800">
                        View the full platform suite →
                    </Link>
                </div>
            </section>

            <section className="py-20 bg-slate-50" id="modules">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Broader workspace roadmap</h2>
                            <p className="text-slate-600 mt-2">Live products are available now, with additional modules visible so teams can plan future rollout.</p>
                        </div>
                        <Link href="/tools" className="text-amber-700 font-bold hover:text-amber-800 text-sm">
                            View full roadmap →
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...liveModules, ...upcomingModules].map((module) => (
                            <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-16 bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Tools Library</p>
                        <h2 className="text-2xl font-black text-slate-900 mt-1">Start with instant calculators, then carry results into workspace delivery workflows.</h2>
                        <p className="text-slate-600 mt-2">Designed for estimators, supervisors, and project engineers who need practical outputs quickly.</p>
                    </div>
                    <div className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <Image src="/branding/hero-dashboard-summary.svg" alt="Project controls dashboard for site delivery workflows" width={720} height={460} className="w-full h-auto" />
                    </div>
                    <Link href="/free-tools" className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold whitespace-nowrap">
                        View tools library
                    </Link>
                </div>
            </section>
        </>
    );
}
