import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { MODULES } from "@/lib/modules";
import { PUBLIC_MEDIA } from "@/lib/public-media";

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
  const upcomingModules = MODULES.filter((module) => module.status === "coming-soon").slice(0, 4);

  const heroMedia = PUBLIC_MEDIA.siteSignHero;
  const sitePlanMedia = PUBLIC_MEDIA.sitePlanWorkflow;
  const workspaceMedia = PUBLIC_MEDIA.workspaceApps;

  return (
    <>
      <section className="bg-slate-950 py-20 text-white md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr,1.1fr] lg:px-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              Live product focus: SiteSign
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Site attendance and delivery coordination for civil teams running live projects.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-300">
              Buildstate is centered on operational workspace products. Start with SiteSign for QR check-in and attendance records, then run planning, tracking,
              and connected project workflows across SitePlan and upcoming apps.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tools/site-sign-in" className="rounded-xl bg-amber-400 px-6 py-3 text-center font-bold text-amber-950 hover:bg-amber-500">
                Open SiteSign
              </Link>
              <Link href="/tools/planner" className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-white hover:border-slate-500">
                Explore SitePlan
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-white hover:border-slate-500">
                Log in
              </Link>
            </div>
          </div>

          <figure className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900">
            <Image src={heroMedia.src} alt={heroMedia.alt} width={heroMedia.width} height={heroMedia.height} className="h-auto w-full" priority />
            <figcaption className="border-t border-slate-700 px-5 py-3 text-xs text-slate-400">
              {heroMedia.sources[0].label} · {heroMedia.sources[0].license}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Buildstate ecosystem</p>
          <h2 className="max-w-4xl text-3xl font-black tracking-tight text-slate-900 md:text-4xl">One umbrella brand. Live products built for civil construction delivery.</h2>
          <p className="max-w-4xl text-slate-600">
            SiteSign manages site attendance and field register controls. SitePlan handles practical planning and delivery tracking. Additional workspace apps are on
            the roadmap for quality, safety, and commercial coordination.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Core products</p>
            <h2 className="text-3xl font-black text-slate-900">Live products used on active sites</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">SiteSign</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Digital QR sign-in with live attendance records</h3>
              <p className="mt-2 text-slate-600">Run daily check-in/out, maintain accurate workforce logs, and export site records for compliance and payroll support.</p>
              <Link href="/tools/site-sign-in" className="mt-4 inline-flex text-sm font-bold text-amber-700 hover:text-amber-800">
                Open SiteSign →
              </Link>
            </article>
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Image src={sitePlanMedia.src} alt={sitePlanMedia.alt} width={sitePlanMedia.width} height={sitePlanMedia.height} className="h-auto w-full" />
              <div className="space-y-2 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">SitePlan</p>
                <h3 className="text-2xl font-black text-slate-900">Planning and delivery tracking for civil programmes</h3>
                <p className="text-slate-600">Map work fronts, sequence tasks, monitor progress, and keep project teams aligned with planned dates and constraints.</p>
                <Link href="/tools/planner" className="inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-800">
                  Explore SitePlan →
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.15fr,0.85fr] lg:px-8">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Workspace apps</p>
            <h2 className="text-3xl font-black text-slate-900">From field checks to connected delivery workflows</h2>
            <p className="text-slate-600">
              Buildstate workspace apps are designed for supervisors, project engineers, and teams coordinating live civil work. Attendance, planning, records, and
              future modules stay connected to each site and project.
            </p>
            <Image src="/branding/video-poster.svg" alt="Field to office delivery workflow summary" width={1280} height={720} className="w-full rounded-2xl border border-slate-300" />
          </div>
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <Image src={workspaceMedia.src} alt={workspaceMedia.alt} width={workspaceMedia.width} height={workspaceMedia.height} className="h-auto w-full" />
            <figcaption className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">Workspace media slot: civil coordination and connected app delivery.</figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-slate-50 py-18" id="modules">
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Live and planned workspace apps</h2>
              <p className="mt-2 text-slate-600">SiteSign and SitePlan are live now, with additional applications mapped for staged rollout.</p>
            </div>
            <Link href="/tools" className="text-sm font-bold text-amber-700 hover:text-amber-800">
              View all workspace apps →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...liveModules, ...upcomingModules].map((module) => (
              <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Supporting tools library</p>
            <p className="mt-2 text-slate-700">Need quick calculators? The Tools Library remains available for field checks and SEO discovery.</p>
          </div>
          <Link href="/free-tools" className="text-sm font-bold text-slate-900 hover:text-slate-700">
            Browse Tools Library →
          </Link>
        </div>
      </section>
    </>
  );
}
