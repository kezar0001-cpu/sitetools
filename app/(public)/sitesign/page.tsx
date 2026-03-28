import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SiteSign — Digital Site Sign-In for Construction | Buildstate",
  description:
    "Replace paper sign-in sheets with QR-based digital gate sign-in. Workers scan with their phone, you get live headcount and export-ready compliance records.",
};

const steps = [
  {
    title: "Set up your site QR code",
    description:
      "Create a site sign-in point and print a single QR poster for the gate. Takes about 5 minutes.",
  },
  {
    title: "Workers scan and sign in",
    description:
      "Every worker checks in from their phone camera in seconds. No apps to download, no accounts needed.",
  },
  {
    title: "Track attendance and export",
    description:
      "Live headcount from your dashboard. Export a signed register as CSV, Excel, or PDF in one click.",
  },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4.5 4.5l15 15" />
      </svg>
    ),
    title: "QR gate sign-in",
    desc: "One poster at the gate. Workers scan with their phone camera — no app install. Works on every phone.",
    color: "amber",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Live headcount",
    desc: "See exactly who is on site right now from your dashboard. Track workers, subcontractors, visitors, and deliveries.",
    color: "amber",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    title: "Digital signatures",
    desc: "Capture a digital signature from every worker on sign-in. Touch-friendly, works on any mobile.",
    color: "amber",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Compliance exports",
    desc: "Download signed attendance registers as CSV, Excel, or PDF — instantly formatted for site audits.",
    color: "amber",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Time & date stamped",
    desc: "Every sign-in and sign-out is timestamped. Workers can correct their arrival time with an audit reason.",
    color: "amber",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    title: "WhatsApp checkout reminders",
    desc: "Send an automatic WhatsApp reminder to workers who forgot to sign out at end of day.",
    color: "amber",
  },
];

const comparison = [
  { item: "Worker sign-in time", paper: "60–90 sec at the gate", sitesign: "< 10 seconds by phone" },
  { item: "Live headcount", paper: "Manual count required", sitesign: "Instant, from your phone" },
  { item: "Compliance record", paper: "Physical clipboard, filed manually", sitesign: "Automatic, digital, downloadable" },
  { item: "Signature capture", paper: "Pen on paper", sitesign: "Digital, stored forever" },
  { item: "Audit preparation", paper: "Hours of data entry", sitesign: "One-click export" },
];

export default function SiteSignPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-amber-400 py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="sitesign-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 60V0H60V60z" fill="none" stroke="black" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sitesign-grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-amber-950/10 border border-amber-950/10 px-4 py-2 rounded-full">
            <span className="text-xs font-black uppercase tracking-widest text-amber-950/70">Buildstate SiteSign</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-amber-950 leading-[1.05] max-w-4xl">
            Gate sign-in.{" "}
            <span className="text-white/90">No more paper.</span>
          </h1>
          <p className="text-xl text-amber-950/75 font-medium max-w-2xl leading-relaxed">
            Replace your paper logbooks with a phone-based QR sign-in system. Workers are at the gate in seconds. You see live headcount and have audit-ready records — instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full justify-center">
            <Link
              href="/login?signup=1&intent=sitesign"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-950 hover:bg-black text-amber-50 font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-amber-950/20"
            >
              Start SiteSign free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/25 hover:bg-white/35 text-amber-950 font-bold text-lg transition-colors border border-amber-950/10 backdrop-blur-sm"
            >
              Log in
            </Link>
          </div>
          <p className="text-xs text-amber-950/50 font-semibold">Free tier available · No credit card · Set up in under 10 min</p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">How it works</p>
            <h2 className="text-4xl font-black text-slate-900">From setup to live in minutes.</h2>
            <p className="text-slate-500 font-medium text-lg">Three steps and your gate is digital.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-3xl border border-amber-100 bg-white p-8 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all hover:-translate-y-1">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 font-black text-xl">
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
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">Features</p>
            <h2 className="text-4xl font-black text-slate-900">Everything a site supervisor needs.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-7 space-y-4 hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">SiteSign vs. paper</p>
            <h2 className="text-4xl font-black text-white">Why switch from clipboards?</h2>
          </div>
          <div className="rounded-3xl overflow-hidden border border-white/10">
            <div className="grid grid-cols-3 bg-white/5 border-b border-white/10 px-6 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Scenario</p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Paper / Clipboard</p>
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">SiteSign</p>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.item}
                className={`grid grid-cols-3 gap-4 px-6 py-5 ${i % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]"} border-b border-white/5 last:border-0`}
              >
                <p className="text-sm font-bold text-slate-300">{row.item}</p>
                <p className="text-sm text-slate-500 font-medium">{row.paper}</p>
                <p className="text-sm text-amber-300 font-bold">{row.sitesign}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-amber-400">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-black text-amber-950">
            Start using SiteSign on your next project.
          </h2>
          <p className="text-xl text-amber-950/70 font-medium">
            No credit card required. Set up your first site in under 10 minutes.
          </p>
          <div className="pt-4">
            <Link
              href="/login?signup=1&intent=sitesign"
              className="inline-flex px-10 py-5 rounded-2xl bg-amber-950 hover:bg-black text-amber-50 font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-amber-950/20"
            >
              Start SiteSign free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
