import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { MODULES } from "@/lib/modules";
import { getPublicMediaSlot, getPublicVideoSlot } from "@/lib/publicSiteMedia";
import { readCmsHeroMediaSettings } from "@/lib/cms/heroMediaSettings";

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

  const liveModules = MODULES.filter((module) => module.status === "live");
  const upcomingModules = MODULES.filter((module) => module.status === "coming-soon").slice(0, 6);

  const heroMedia = getPublicMediaSlot("siteSignHeroCardImage");
  const heroVideo = getPublicVideoSlot("siteSignHeroBackground");
  const sitePlanMedia = getPublicMediaSlot("sitePlanWorkflow");
  const workspaceMedia = getPublicMediaSlot("workspaceApps");

  const {
    heroVideoUrl,
    heroVideoPosterUrl,
    heroCardImageUrl,
  } = await readCmsHeroMediaSettings({
    heroVideoUrl: heroVideo.src,
    heroVideoPosterUrl: heroVideo.poster,
    heroCardImageUrl: heroMedia.src,
  });

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white py-20 md:py-28">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          autoPlay
          muted
          loop
          playsInline
          poster={heroVideoPosterUrl}
        >
          <source src={heroVideoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_35%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/30">
                Live now: SiteSign
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                Site attendance and workforce visibility for live civil projects.
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                Buildstate is a connected workspace for project engineers and supervisors. SiteSign leads the platform with QR check-in,
                real-time attendance registers, and export-ready records for practical site delivery.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/tools/site-sign-in" className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-center transition-colors">
                  Open SiteSign
                </Link>
                <Link href="/tools/planner" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                  Explore SitePlan
                </Link>
                <Link href="/login" className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-xl text-center transition-colors">
                  Log in
                </Link>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/85 backdrop-blur-sm">
              <Image src={heroCardImageUrl} alt={heroMedia.alt} width={heroMedia.width} height={heroMedia.height} className="w-full h-auto object-cover" priority />
              <div className="p-5 border-t border-slate-800 text-xs text-slate-400">
                Hero background video: {heroVideo.sourceName} · Hero card image: {heroMedia.sourceName}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Buildstate ecosystem</p>
          <h2 className="text-3xl font-black text-slate-900 max-w-4xl">Buildstate is the umbrella platform for field operations, planning control, and connected project records.</h2>
          <p className="text-slate-600 max-w-4xl">
            Instead of disconnected spreadsheets and standalone checklists, Buildstate products share one practical workspace for site teams,
            project controls, and delivery managers.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Core products</h2>
            <p className="text-slate-600 mt-2">SiteSign and SitePlan are the lead products for civil construction coordination and delivery tracking.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <Image src={heroMedia.src} alt={heroMedia.alt} width={heroMedia.width} height={heroMedia.height} className="w-full h-52 object-cover" />
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">SiteSign</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">QR sign-in and live attendance records</h3>
                <p className="text-slate-600 mt-2">Capture worker attendance in minutes and maintain reliable site access records for compliance, supervision, and payroll support.</p>
                <Link href="/tools/site-sign-in" className="inline-flex mt-4 text-sm font-bold text-amber-700 hover:text-amber-800">Open SiteSign →</Link>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <Image src={sitePlanMedia.src} alt={sitePlanMedia.alt} width={sitePlanMedia.width} height={sitePlanMedia.height} className="w-full h-52 object-cover" />
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-indigo-700">SitePlan</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Planning and delivery tracking for crews and programmes</h3>
                <p className="text-slate-600 mt-2">Build practical programmes, track progress against plan, and maintain clear visibility of project milestones and constraints.</p>
                <Link href="/tools/planner" className="inline-flex mt-4 text-sm font-bold text-indigo-700 hover:text-indigo-800">Explore SitePlan →</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1fr,1.1fr] gap-8 items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Workspace apps</p>
            <h2 className="text-3xl font-black text-slate-900">Connected apps for site diaries, inspections, plant checks, incidents, and timesheets.</h2>
            <p className="text-slate-600">
              Buildstate is expanding into a full workspace suite so field records, planning updates, and delivery decisions stay connected at project level.
            </p>
            <Link href="/tools" className="inline-flex text-sm font-bold text-slate-900 hover:text-slate-700">View product roadmap →</Link>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
            <Image src={workspaceMedia.src} alt={workspaceMedia.alt} width={workspaceMedia.width} height={workspaceMedia.height} className="w-full h-auto object-cover" />
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50" id="modules">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Live and planned workspace apps</h2>
              <p className="text-slate-600 mt-2">Live products are available now, with planned apps visible for staged rollout across teams.</p>
            </div>
            <Link href="/tools" className="text-amber-700 font-bold hover:text-amber-800 text-sm">View full app list →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...liveModules, ...upcomingModules].map((module) => (
              <ModuleCard key={module.id} module={module} hrefOverride={`/tools/${module.id}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Supporting tools library</p>
            <p className="text-slate-700 mt-2">Need quick calculations? The Tools Library stays available as a supporting utility layer.</p>
          </div>
          <Link href="/free-tools" className="text-sm font-bold text-slate-900 hover:text-slate-700">Open Tools Library →</Link>
        </div>
      </section>
    </>
  );
}
