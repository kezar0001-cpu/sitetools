import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Buildstate | Civil Site Operations Platform",
  description:
    "Buildstate builds practical workspace tools for civil construction teams — replacing paper registers, disconnected spreadsheets, and manual QA workflows with one connected digital platform.",
};

const modules = [
  {
    name: "SiteSign",
    color: "text-amber-400",
    border: "border-amber-400/20",
    bg: "bg-amber-400/5",
    desc: "QR-based worker sign-in replacing paper gate registers.",
  },
  {
    name: "SitePlan",
    color: "text-blue-400",
    border: "border-blue-400/20",
    bg: "bg-blue-400/5",
    desc: "Programme planning and daily delivery progress tracking.",
  },
  {
    name: "SiteCapture",
    color: "text-sky-400",
    border: "border-sky-400/20",
    bg: "bg-sky-400/5",
    desc: "Structured daily diary, weather, labour, and site events.",
  },
  {
    name: "SiteITP",
    color: "text-violet-400",
    border: "border-violet-400/20",
    bg: "bg-violet-400/5",
    desc: "Hold and witness point checklists with digital sign-off.",
  },
  {
    name: "SiteDocs",
    color: "text-cyan-400",
    border: "border-cyan-400/20",
    bg: "bg-cyan-400/5",
    desc: "Document control from draft to approved revision.",
  },
];

const principles = [
  {
    title: "Built for the field, not the boardroom",
    desc: "Every feature is designed around real site workflows. If it doesn't work for a supervisor standing at the gate or an engineer updating progress between lifts, it doesn't ship.",
  },
  {
    title: "Fast to adopt on live projects",
    desc: "Tools that take weeks to set up don't get used. Buildstate is designed so teams can get productive on their first day — with no training requirements for workers on site.",
  },
  {
    title: "Records that actually hold up",
    desc: "Paper diaries get lost. Spreadsheets conflict. Buildstate creates structured, timestamped, audit-ready records that protect teams when it matters most.",
  },
  {
    title: "One workspace, not a stack of apps",
    desc: "Sign-in, programme tracking, daily records, quality management, and documents — all under one login, sharing the same site and project context.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-zinc-950">
      {/* Hero */}
      <section className="border-b border-zinc-800 bg-zinc-950 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">About</p>
          <h1 className="text-4xl font-black leading-tight text-zinc-50 sm:text-5xl lg:text-6xl">
            Operations software built for{" "}
            <span className="text-amber-400">civil delivery teams.</span>
          </h1>
          <p className="max-w-2xl text-xl font-medium leading-relaxed text-zinc-400">
            Buildstate replaces the clipboards, notebooks, and disconnected spreadsheets that slow down
            civil construction teams — with a single digital workspace designed for the realities of
            site delivery.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-zinc-900 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-5">
              <p className="text-xs font-black uppercase tracking-widest text-amber-600">Our mission</p>
              <h2 className="text-3xl font-black text-zinc-50">
                Practical tools for the people who deliver civil infrastructure.
              </h2>
              <p className="text-lg font-medium leading-relaxed text-zinc-400">
                Project engineers, site supervisors, and leading hands carry enormous operational
                responsibility. They manage crews, compliance, programmes, and quality — often with
                tools that were not designed for them.
              </p>
              <p className="text-base leading-relaxed text-zinc-500">
                Buildstate exists to change that. We build software around the actual daily workflows
                of civil construction — the gate sign-in, the daily diary, the ITP checklist, the
                programme update — and connect them into one reliable workspace.
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-xs font-black uppercase tracking-widest text-amber-600">The problem</p>
              <h2 className="text-3xl font-black text-zinc-50">
                Civil sites deserve better than clipboards.
              </h2>
              <p className="text-base leading-relaxed text-zinc-500">
                Manual sign-in sheets get lost. WhatsApp programme updates create version confusion.
                QA checklists are paper-based and hard to audit. Daily diaries take an hour at the
                end of a twelve-hour shift.
              </p>
              <p className="text-base leading-relaxed text-zinc-500">
                This is not a technology gap — it is a design gap. The tools have not been built for
                the people who need them most. Buildstate closes that gap with software that is
                genuinely usable in the field, not just in the office.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product suite */}
      <section className="bg-zinc-950 py-20">
        <div className="mx-auto max-w-5xl space-y-12 px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">The platform</p>
            <h2 className="text-4xl font-black text-zinc-50">Five modules. One workspace.</h2>
            <p className="mx-auto max-w-2xl text-lg font-medium text-zinc-400">
              Each module solves a specific operational problem on civil sites. Together they replace
              every paper-based or disconnected system your team currently relies on.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div
                key={m.name}
                className={`rounded-2xl border ${m.border} ${m.bg} p-6 space-y-2`}
              >
                <p className={`text-base font-black ${m.color}`}>{m.name}</p>
                <p className="text-sm font-medium leading-relaxed text-zinc-400">{m.desc}</p>
              </div>
            ))}

            {/* CTA card */}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 flex flex-col justify-between space-y-4 sm:col-span-2 lg:col-span-1">
              <p className="text-base font-black text-zinc-50">Ready to get started?</p>
              <p className="text-sm font-medium text-zinc-400">
                Free to start. No credit card required. Set up your first site in minutes.
              </p>
              <Link
                href="/login?signup=1"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-amber-950 transition-all hover:scale-105 hover:bg-amber-300"
              >
                Create workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-zinc-900 py-20">
        <div className="mx-auto max-w-5xl space-y-12 px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">How we build</p>
            <h2 className="text-4xl font-black text-zinc-50">Our design principles.</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {principles.map((p) => (
              <div
                key={p.title}
                className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-7"
              >
                <h3 className="text-lg font-black text-zinc-50">{p.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-amber-400 py-20">
        <div className="mx-auto max-w-4xl space-y-8 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-amber-950 sm:text-5xl">
            Try Buildstate on your next project.
          </h2>
          <p className="mx-auto max-w-xl text-xl font-medium text-amber-950/70">
            Free to start, built for civil sites. Set up your workspace in under 10 minutes.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link
              href="/login?signup=1"
              className="w-full rounded-2xl bg-amber-950 px-10 py-5 text-xl font-black text-amber-50 shadow-2xl shadow-amber-950/20 transition-all hover:scale-105 hover:bg-black active:scale-95 sm:w-auto"
            >
              Create free workspace
            </Link>
            <Link
              href="/contact"
              className="w-full rounded-2xl bg-amber-300/70 px-10 py-5 text-xl font-bold text-amber-950 transition-colors hover:bg-amber-200 sm:w-auto"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
