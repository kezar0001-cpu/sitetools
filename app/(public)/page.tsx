import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { loadResolvedMediaSlots } from "@/lib/cms/publicMedia";

const SiteSignDemo = dynamic(() => import("@/components/animations/SiteSignDemo"), { ssr: false });
const SitePlanDemo = dynamic(() => import("@/components/animations/SitePlanDemo"), { ssr: false });
const SiteCaptureDemo = dynamic(() => import("@/components/animations/SiteCaptureDemo"), { ssr: false });
const SiteITPDemo = dynamic(() => import("@/components/animations/SiteITPDemo"), { ssr: false });

export const metadata: Metadata = {
  title: "Buildstate — Civil Site Operations Platform",
  description:
    "Replace clipboards and paper registers with one digital workspace. SiteSign, SitePlan, SiteCapture, and ITP management for civil construction teams.",
};

interface LandingPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

const TESTIMONIALS = [
  {
    quote: "Replaced our paper sign-in book the first day. Inspectors love the QR ITPs.",
    name: "Site Supervisor",
    company: "NSW Civil Contractor",
  },
  {
    quote: "Programme tracking actually gets used now. Team updates progress from site.",
    name: "Project Engineer",
    company: "Infrastructure Alliance",
  },
  {
    quote: "Audit prep used to take a day. Now it's one export click.",
    name: "Project Manager",
    company: "Tier 2 Contractor",
  },
];

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

  const { videoSlots } = await loadResolvedMediaSlots();

  return (
    <div className="bg-zinc-950">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 lg:py-36 min-h-[600px]">
        {/* Video background */}
        <div suppressHydrationWarning>
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            src={videoSlots.siteSignHeroBackground.src}
            poster={videoSlots.siteSignHeroBackground.poster}
          />
        </div>
        {/* Dark overlay — sibling to video */}
        <div className="absolute inset-0 bg-zinc-950/75" />

        {/* Noscript fallback */}
        <noscript>
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
        </noscript>

        {/* Decorative background grid */}
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.06]">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 60V0H60V60z" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 z-[1] h-96 w-96 rounded-full bg-amber-400/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 z-[1] h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Built for Civil Construction
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-zinc-50 leading-[1.05] max-w-4xl">
              One workspace for{" "}
              <span className="text-amber-400">every job on site.</span>
            </h1>

            <p className="text-xl text-zinc-400 font-medium max-w-2xl leading-relaxed">
              Replace clipboards, paper registers, and disconnected spreadsheets. Buildstate gives civil site
              teams a single digital operations platform — from gate sign-in to programme delivery.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link
                href="/login?signup=1"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-amber-400/20"
              >
                Start your workspace free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-50 font-bold text-lg transition-colors border border-white/10"
              >
                Log in
              </Link>
            </div>

            <p className="text-xs text-zinc-500 font-medium">
              No credit card required · Set up in minutes · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust bar ────────────────────────────────────────────────────── */}
      <div className="border-y border-zinc-800 bg-zinc-900 py-5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
            Used by civil contractors across Australia
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {["Site Supervisors", "Project Engineers", "Foremen", "Project Managers", "EHS Officers"].map((role) => (
              <span key={role} className="flex items-center gap-2 text-sm font-semibold text-zinc-400">
                <svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Module Showcase ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">The Platform Suite</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50">
              Everything your site team needs.
            </h2>
            <p className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto">
              Four modules, one workspace. Each one purpose-built for the realities of civil site delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* SiteSign */}
            <Link
              href="/sitesign"
              className="group relative rounded-3xl border border-zinc-700/50 bg-zinc-900 p-8 hover:border-amber-400/30 hover:shadow-xl hover:shadow-amber-400/5 transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full -mr-16 -mt-16 group-hover:bg-amber-400/10 transition-colors" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-amber-950 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4.5 4.5l15 15" />
                  </svg>
                </div>
                <div className="inline-block bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">Live</div>
                <h3 className="text-2xl font-black text-zinc-50 mb-2">SiteSign</h3>
                <p className="text-zinc-400 font-medium leading-relaxed mb-4">
                  QR-based digital gate sign-in. Workers scan with their phone — no app needed. Live headcount, compliance exports, and signature capture.
                </p>
                <div className="mb-6">
                  <SiteSignDemo />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["QR sign-in", "Live headcount", "CSV / PDF exports", "Signatures"].map((t) => (
                    <span key={t} className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 text-amber-400 font-bold text-sm group-hover:gap-3 transition-all">
                  Explore SiteSign
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* SitePlan */}
            <Link
              href="/siteplan"
              className="group relative rounded-3xl border border-zinc-700/50 bg-zinc-900 p-8 hover:border-blue-400/30 hover:shadow-xl hover:shadow-blue-400/5 transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-400/10 transition-colors" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="inline-block bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">Live</div>
                <h3 className="text-2xl font-black text-zinc-50 mb-2">SitePlan</h3>
                <p className="text-zinc-400 font-medium leading-relaxed mb-4">
                  Civil programme planning and delivery tracking. Build your programme, track daily progress, manage delays, and keep field and office teams aligned.
                </p>
                <div className="mb-6">
                  <SitePlanDemo />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Programme tracking", "Milestone management", "Delay flags", "Team alignment"].map((t) => (
                    <span key={t} className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 text-blue-400 font-bold text-sm group-hover:gap-3 transition-all">
                  Explore SitePlan
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* SiteCapture */}
            <div className="group relative rounded-3xl border border-zinc-700/50 bg-zinc-900 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-sky-400/5 rounded-full -mr-16 -mt-16" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center text-white mb-6">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="inline-block bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">Live</div>
                <h3 className="text-2xl font-black text-zinc-50 mb-2">SiteCapture</h3>
                <p className="text-zinc-400 font-medium leading-relaxed mb-4">
                  Daily weather conditions, work completed, delays, instructions, and photos. Generate professional reports for your principal contractor.
                </p>
                <div className="mb-6">
                  <SiteCaptureDemo />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Daily records", "Weather logging", "Photo attachments", "PDF reports"].map((t) => (
                    <span key={t} className="text-xs font-bold text-sky-400 bg-sky-400/10 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* SiteITP */}
            <div className="group relative rounded-3xl border border-zinc-700/50 bg-zinc-900 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-violet-400/5 rounded-full -mr-16 -mt-16" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white mb-6">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="inline-block bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">Live</div>
                <h3 className="text-2xl font-black text-zinc-50 mb-2">SiteITP</h3>
                <p className="text-zinc-400 font-medium leading-relaxed mb-4">
                  Hold &amp; witness point checklists, AI-generated or built manually. Share QR codes for sign-off — no app or account required for inspectors.
                </p>
                <div className="mb-6">
                  <SiteITPDemo />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["ITP checklists", "AI generation", "QR sign-off", "Hold & witness"].map((t) => (
                    <span key={t} className="text-xs font-bold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">From the field</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50">
              What site teams say.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="rounded-3xl border border-zinc-700/50 bg-zinc-900 p-8 space-y-4 animate-fade-up"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="text-6xl text-amber-400 leading-none font-black">&ldquo;</div>
                <p className="italic text-zinc-300 font-medium leading-relaxed">{t.quote}</p>
                <div className="pt-2">
                  <p className="text-sm font-black text-zinc-500">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">The difference</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50">
              Before and after Buildstate.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* The old way */}
            <div className="bg-red-950/30 border border-red-900/30 rounded-3xl p-8 space-y-6">
              <h3 className="text-xl font-black text-zinc-50">The old way</h3>
              <ul className="space-y-4">
                {[
                  "Paper sign-in books lost, damaged, or incomplete",
                  "Spreadsheet programmes nobody keeps updated",
                  "Handwritten daily diaries that take an hour to type up",
                  "ITP checklists printed, signed, and scanned — or just lost",
                  "Audit prep taking a full day to pull together",
                  "Site supervisors chasing signatures via WhatsApp",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 text-red-400 text-lg leading-none font-black shrink-0">✕</span>
                    <span className="text-zinc-400 font-medium text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* With Buildstate */}
            <div className="bg-amber-950/30 border border-amber-900/30 rounded-3xl p-8 space-y-6">
              <h3 className="text-xl font-black text-zinc-50">With Buildstate</h3>
              <ul className="space-y-4">
                {[
                  "QR gate sign-in — workers scan, you see who's on site instantly",
                  "Live programme tracking updated from the field in seconds",
                  "Daily diary captured and exported as a PDF report in one click",
                  "ITP QR codes shared with inspectors — signed off without an account",
                  "One-click export gives you a complete audit trail",
                  "Signatures captured digitally, timestamped and stored automatically",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 text-amber-400 text-lg leading-none font-black shrink-0">✓</span>
                    <span className="text-zinc-400 font-medium text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── A day on site with Buildstate ────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-zinc-950 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="workflow-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V0H40V40z" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#workflow-grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">How it fits together</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50">
              From gate to programme — all in one place.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                time: "7:00 AM",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4.5 4.5l15 15" />
                  </svg>
                ),
                title: "Gate sign-in",
                desc: "Workers scan QR code at the gate. Live headcount visible instantly. No paperwork.",
                color: "amber",
              },
              {
                time: "8:30 AM",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "ITP checkpoint",
                desc: "Inspector scans a QR code and signs off hold / witness points on the spot.",
                color: "violet",
              },
              {
                time: "4:00 PM",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ),
                title: "Daily diary",
                desc: "Engineer logs weather, progress, delays, and instructions before leaving site.",
                color: "sky",
              },
              {
                time: "5:00 PM",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                title: "Programme updated",
                desc: "PM marks today's progress. Delays flagged. Tomorrow's tasks confirmed.",
                color: "blue",
              },
            ].map((step) => (
              <div key={step.time} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    step.color === "amber" ? "bg-amber-400 text-amber-950" :
                    step.color === "violet" ? "bg-violet-500 text-white" :
                    step.color === "sky" ? "bg-sky-500 text-white" :
                    "bg-blue-600 text-white"
                  }`}>
                    {step.icon}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{step.time}</span>
                </div>
                <h3 className="text-lg font-black text-zinc-50">{step.title}</h3>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Buildstate ───────────────────────────────────────────────── */}
      <section className="py-24 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">Why teams choose us</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50">
              Built for site. Not just software.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Mobile first",
                desc: "Every tool works on the phone you already have in your pocket. No specialist hardware, no app store download for workers.",
              },
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Compliance ready",
                desc: "Export attendance registers, signed records, and audit trails in PDF, CSV, or Excel — ready for any site audit or authority request.",
              },
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Set up in minutes",
                desc: "Create your workspace, register your site, and print your first QR sign-in poster in under 10 minutes. No IT team required.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shadow-sm">
                  {item.icon}
                </div>
                <h3 className="text-xl font-black text-zinc-50">{item.title}</h3>
                <p className="text-zinc-400 font-medium leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-amber-400">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-amber-950">
            Start your Buildstate workspace today.
          </h2>
          <p className="text-xl text-amber-950/70 font-medium max-w-xl mx-auto">
            Free to start. No credit card. Set up your first site in minutes and see why civil teams switch from clipboards.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login?signup=1"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-amber-950 hover:bg-black text-amber-50 font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-amber-950/20"
            >
              Create your workspace
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 font-bold text-xl transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
