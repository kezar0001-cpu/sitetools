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
                        Buildstate platform
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10 items-end">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                Digital construction tools,
                                <span className="text-amber-400"> under one Buildstate platform.</span>
                            </h1>
                            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                                Buildstate is being structured as a modular suite for Australian civil contractors, engineers, supervisors, and project teams. Site Sign In is live today, with more modules rolling out soon.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link href="/login?signup=1" className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-center transition-colors">
                                    Create Buildstate account
                                </Link>
                                <Link href="/free-tools" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                                    Free construction tools
                                </Link>
                                <Link href="/tools" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                                    View all modules
                                </Link>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live now</p>
                            {liveModules.map((module) => (
                                <div key={module.id} className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                                    <p className="text-sm font-bold text-white">{module.name}</p>
                                    <p className="text-sm text-slate-300 mt-1">{module.tagline}</p>
                                </div>
                            ))}
                            <p className="text-sm text-slate-400">
                                Planned modules are visible in the dashboard as <span className="font-semibold text-slate-200">Coming soon</span> to set expectations without promising unfinished features.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16 bg-white border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                        <p className="text-sm font-bold text-slate-900">One platform identity</p>
                        <p className="text-sm text-slate-600 mt-2">Single Buildstate login, shared navigation, and a consistent module experience.</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                        <p className="text-sm font-bold text-slate-900">Independent modules</p>
                        <p className="text-sm text-slate-600 mt-2">Each tool can run independently while sharing account and organisation context.</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                        <p className="text-sm font-bold text-slate-900">Built for site teams</p>
                        <p className="text-sm text-slate-600 mt-2">Mobile-friendly workflows designed for practical use by crews and supervisors onsite.</p>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-slate-50" id="modules">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Buildstate module suite</h2>
                            <p className="text-slate-600 mt-2">The first release includes Site Sign In. Additional modules are roadmap items.</p>
                        </div>
                        <Link href="/tools" className="text-amber-700 font-bold hover:text-amber-800 text-sm">
                            Module roadmap →
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Public Free Tools</p>
                        <h2 className="text-2xl font-black text-slate-900 mt-1">No-login calculators for concrete, trenching, asphalt, mesh, and setout.</h2>
                        <p className="text-slate-600 mt-2">Buildstate Free Tools are designed for quick quantity checks and practical site math, with optional upgrade paths into project workflows.</p>
                    </div>
                    <Link href="/free-tools" className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold whitespace-nowrap">
                        Open free tools directory
                    </Link>
                </div>
            </section>
        </>
    );
}
