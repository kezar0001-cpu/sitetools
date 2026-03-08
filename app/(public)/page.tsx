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
                        Civil construction platform
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10 items-end">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                Practical tools for civil delivery,
                                <span className="text-amber-400"> from instant calculations to connected workspace workflows.</span>
                            </h1>
                            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                                Buildstate includes quick public tools for no-login checks, plus workspace tools for project-linked records, site coordination, and team collaboration. Advanced capabilities are available where needed.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link href="/free-tools" className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-center transition-colors">
                                    Open instant tools
                                </Link>
                                <Link href="/tools" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                                    View workspace tools
                                </Link>
                                <Link href="/login?signup=1" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                                    Create account
                                </Link>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <Image src="/branding/hero-site-team.svg" alt="Australian civil construction team coordinating field delivery" width={1200} height={760} className="w-full h-auto object-cover" priority />
                            <div className="p-6 space-y-3 border-t border-slate-800">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Access model</p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 font-bold">Public</span>
                                    <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-1 font-bold">Workspace</span>
                                    <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 font-bold">Advanced</span>
                                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 font-bold">Planned</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16 bg-white border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                        <p className="text-sm font-bold text-slate-900">Instant-use tools</p>
                        <p className="text-sm text-slate-600 mt-2">No-login calculators for rapid field checks, takeoff sanity checks, and day-to-day quantity math.</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                        <p className="text-sm font-bold text-slate-900">Workspace tools</p>
                        <p className="text-sm text-slate-600 mt-2">Login where needed to save records, connect projects and sites, and support team workflows.</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                        <p className="text-sm font-bold text-slate-900">Advanced capability</p>
                        <p className="text-sm text-slate-600 mt-2">Enable higher-depth features only when your delivery process needs them.</p>
                    </div>
                </div>
            </section>


            <section className="py-12 bg-slate-100 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.2fr,0.8fr] gap-6 items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">From fast checks to connected delivery records</h2>
                        <p className="text-slate-600 mt-2">Instant tools support rapid decisions in the field. Workspace tools keep those decisions tied to projects, sites, and teams.</p>
                    </div>
                    <video className="w-full rounded-2xl border border-slate-300 bg-slate-900" autoPlay loop muted playsInline poster="/branding/video-poster.svg">
                        <source src="/branding/site-operations-loop.mp4" type="video/mp4" />
                    </video>
                </div>
            </section>

            <section className="py-20 bg-slate-50" id="modules">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Workspace toolset</h2>
                            <p className="text-slate-600 mt-2">Use connected tools for live project operations, with roadmap visibility for upcoming modules.</p>
                        </div>
                        <Link href="/tools" className="text-amber-700 font-bold hover:text-amber-800 text-sm">
                            Tool roadmap →
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
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Tools library</p>
                        <h2 className="text-2xl font-black text-slate-900 mt-1">Start with instant calculators, then carry results into workspace delivery workflows.</h2>
                        <p className="text-slate-600 mt-2">Designed for estimators, supervisors, and project engineers who need practical outputs quickly.</p>
                    </div>
                    <div className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <Image src="/branding/hero-dashboard-summary.svg" alt="Project controls dashboard for site delivery workflows" width={720} height={460} className="w-full h-auto" />
                    </div>
                    <Link href="/free-tools" className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold whitespace-nowrap">
                        Open tools library
                    </Link>
                </div>
            </section>
        </>
    );
}
