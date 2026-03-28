import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SitePlan — Civil Programme Planning & Delivery Tracking | Buildstate",
  description:
    "Build your civil programme, track daily delivery progress, manage delays, and keep field and office teams aligned. Purpose-built for civil construction project managers.",
};

const steps = [
  {
    title: "Build your programme",
    description:
      "Create project stages, milestones, and tasks. Set planned start and end dates and link them to your site.",
  },
  {
    title: "Track daily delivery",
    description:
      "Update actual progress daily. Delay flags appear automatically when work falls behind planned dates.",
  },
  {
    title: "Coordinate your team",
    description:
      "One shared planning view for engineers, supervisors, and PMs. Everyone sees the same up-to-date programme.",
  },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Programme builder",
    desc: "Create structured delivery programmes with stages, tasks, and milestones. Import or build from scratch.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    title: "Progress tracking",
    desc: "Mark daily delivery progress against planned dates. See instantly what's on track, ahead, or behind.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    title: "Delay flags",
    desc: "Automatic delay detection highlights items that have slipped. Log reasons and corrective actions directly.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    title: "Gantt view",
    desc: "Visualise your programme as a Gantt chart. Drag to adjust dates, see dependencies, and track critical path.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Team collaboration",
    desc: "Shared workspace for field and office. Every update is visible to the whole project team immediately.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Reporting",
    desc: "Generate programme reports for your principal contractor or client. Export progress summaries quickly.",
  },
];

const audiences = [
  {
    role: "Project Engineer",
    task: "Track delivery progress and flag delays before they become problems.",
    color: "blue",
  },
  {
    role: "Site Supervisor",
    task: "See today's tasks clearly and know what's planned for the week ahead.",
    color: "indigo",
  },
  {
    role: "Project Manager",
    task: "Maintain programme visibility and report delivery status to clients.",
    color: "violet",
  },
];

export default function SitePlanPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="sp-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 60V0H60V60z" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sp-grid)" />
          </svg>
        </div>
        <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-blue-400/10 border border-blue-400/20 px-4 py-2 rounded-full">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-blue-300">Buildstate SitePlan</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-4xl">
            Civil programme planning,{" "}
            <span className="text-blue-400">built for the field.</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-2xl leading-relaxed">
            Build your delivery programme, track daily progress, and keep field and office teams aligned — in one shared workspace designed for civil construction.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full justify-center">
            <Link
              href="/login?signup=1&intent=siteplan"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20"
            >
              Start SitePlan free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-lg transition-colors border border-white/10"
            >
              Log in
            </Link>
          </div>
          <p className="text-xs text-slate-500 font-medium">Free to start · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── Audience targeting ───────────────────────────────────────────── */}
      <section className="py-16 bg-blue-50 border-y border-blue-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {audiences.map((a) => (
              <div key={a.role} className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">{a.role}</p>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed">{a.task}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">How it works</p>
            <h2 className="text-4xl font-black text-slate-900">From programme to delivery — in one view.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-3xl border border-blue-100 bg-slate-50 p-8 hover:shadow-lg hover:border-blue-200 transition-all">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-xl">
                  {index + 1}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-6">{step.title}</h3>
                <p className="text-slate-600 mt-3 font-medium leading-relaxed">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">Features</p>
            <h2 className="text-4xl font-black text-slate-900">Everything you need to run a live programme.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-blue-600">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-black text-white">
            Start SitePlan with your next programme.
          </h2>
          <p className="text-xl text-blue-100 font-medium">
            Free to get started. No spreadsheets, no disconnected systems, no guesswork.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login?signup=1&intent=siteplan"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
            >
              Start SitePlan free
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xl transition-colors"
            >
              View all modules
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
