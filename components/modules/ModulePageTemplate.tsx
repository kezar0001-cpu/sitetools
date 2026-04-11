import Link from "next/link";
import { ReactNode } from "react";

// Per-module colour themes. Every class string is a complete Tailwind literal
// so the scanner picks them up at build time without safelisting.
const THEMES = {
  amber: {
    heroBg: "bg-amber-400",
    heroText: "text-amber-950",
    badgeClass: "border-amber-950/10 bg-amber-950/10 text-amber-950/70",
    heroDesc: "text-amber-950/75",
    primaryBtn:
      "bg-amber-950 text-amber-50 shadow-2xl shadow-amber-950/20 hover:bg-black active:scale-95",
    secondaryBtn:
      "border-amber-950/10 bg-white/25 text-amber-950 backdrop-blur-sm hover:bg-white/35",
    helperText: "text-amber-950/50",
    demoEyebrow: "text-amber-600",
    demoBorder: "border-amber-200/40",
    featureIcon: "bg-amber-100 text-amber-700",
    featureHover: "hover:border-amber-400/30 hover:bg-amber-50/10",
    compEyebrow: "text-amber-400",
    compColHeader: "text-amber-400",
    compValue: "text-amber-300",
    ctaBg: "bg-amber-400",
    ctaText: "text-amber-950",
    ctaDesc: "text-amber-950/70",
    ctaPrimaryBtn:
      "bg-amber-950 text-amber-50 shadow-2xl shadow-amber-950/20 hover:bg-black active:scale-95",
    ctaSecondaryBtn: "bg-amber-300/70 text-amber-950 hover:bg-amber-200",
    ctaModuleText: "text-amber-950/60",
  },
  blue: {
    heroBg: "bg-blue-600",
    heroText: "text-white",
    badgeClass: "border-white/20 bg-white/10 text-white/70",
    heroDesc: "text-blue-100",
    primaryBtn:
      "bg-white text-blue-900 shadow-2xl shadow-blue-950/30 hover:bg-blue-50 active:scale-95",
    secondaryBtn:
      "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
    helperText: "text-white/50",
    demoEyebrow: "text-blue-400",
    demoBorder: "border-blue-400/30",
    featureIcon: "bg-blue-500/20 text-blue-400",
    featureHover: "hover:border-blue-500/30 hover:bg-blue-900/20",
    compEyebrow: "text-blue-400",
    compColHeader: "text-blue-400",
    compValue: "text-blue-300",
    ctaBg: "bg-blue-600",
    ctaText: "text-white",
    ctaDesc: "text-blue-100",
    ctaPrimaryBtn:
      "bg-white text-blue-900 shadow-2xl shadow-blue-950/30 hover:bg-blue-50 active:scale-95",
    ctaSecondaryBtn: "bg-blue-700 text-white hover:bg-blue-800",
    ctaModuleText: "text-white/60",
  },
  sky: {
    heroBg: "bg-sky-500",
    heroText: "text-white",
    badgeClass: "border-white/20 bg-white/10 text-white/70",
    heroDesc: "text-sky-100",
    primaryBtn:
      "bg-white text-sky-900 shadow-2xl shadow-sky-950/30 hover:bg-sky-50 active:scale-95",
    secondaryBtn:
      "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
    helperText: "text-white/50",
    demoEyebrow: "text-sky-400",
    demoBorder: "border-sky-400/30",
    featureIcon: "bg-sky-500/20 text-sky-400",
    featureHover: "hover:border-sky-500/30 hover:bg-sky-900/20",
    compEyebrow: "text-sky-400",
    compColHeader: "text-sky-400",
    compValue: "text-sky-300",
    ctaBg: "bg-sky-500",
    ctaText: "text-white",
    ctaDesc: "text-sky-100",
    ctaPrimaryBtn:
      "bg-white text-sky-900 shadow-2xl shadow-sky-950/30 hover:bg-sky-50 active:scale-95",
    ctaSecondaryBtn: "bg-sky-600 text-white hover:bg-sky-700",
    ctaModuleText: "text-white/60",
  },
  violet: {
    heroBg: "bg-violet-600",
    heroText: "text-white",
    badgeClass: "border-white/20 bg-white/10 text-white/70",
    heroDesc: "text-violet-100",
    primaryBtn:
      "bg-white text-violet-900 shadow-2xl shadow-violet-950/30 hover:bg-violet-50 active:scale-95",
    secondaryBtn:
      "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
    helperText: "text-white/50",
    demoEyebrow: "text-violet-400",
    demoBorder: "border-violet-400/30",
    featureIcon: "bg-violet-500/20 text-violet-400",
    featureHover: "hover:border-violet-500/30 hover:bg-violet-900/20",
    compEyebrow: "text-violet-400",
    compColHeader: "text-violet-400",
    compValue: "text-violet-300",
    ctaBg: "bg-violet-600",
    ctaText: "text-white",
    ctaDesc: "text-violet-100",
    ctaPrimaryBtn:
      "bg-white text-violet-900 shadow-2xl shadow-violet-950/30 hover:bg-violet-50 active:scale-95",
    ctaSecondaryBtn: "bg-violet-700 text-white hover:bg-violet-800",
    ctaModuleText: "text-white/60",
  },
  cyan: {
    heroBg: "bg-cyan-500",
    heroText: "text-cyan-950",
    badgeClass: "border-cyan-950/10 bg-cyan-950/10 text-cyan-950/70",
    heroDesc: "text-cyan-950/75",
    primaryBtn:
      "bg-cyan-950 text-cyan-50 shadow-2xl shadow-cyan-950/20 hover:bg-black active:scale-95",
    secondaryBtn:
      "border-cyan-950/10 bg-white/25 text-cyan-950 backdrop-blur-sm hover:bg-white/35",
    helperText: "text-cyan-950/50",
    demoEyebrow: "text-cyan-400",
    demoBorder: "border-cyan-400/30",
    featureIcon: "bg-cyan-500/20 text-cyan-400",
    featureHover: "hover:border-cyan-500/30 hover:bg-cyan-900/20",
    compEyebrow: "text-cyan-400",
    compColHeader: "text-cyan-400",
    compValue: "text-cyan-300",
    ctaBg: "bg-cyan-500",
    ctaText: "text-cyan-950",
    ctaDesc: "text-cyan-950/75",
    ctaPrimaryBtn:
      "bg-cyan-950 text-cyan-50 shadow-2xl shadow-cyan-950/20 hover:bg-black active:scale-95",
    ctaSecondaryBtn: "bg-cyan-400 text-cyan-950 hover:bg-cyan-300",
    ctaModuleText: "text-cyan-950/60",
  },
} as const;

export type ModuleTheme = keyof typeof THEMES;

interface ModulePageTemplateCta {
  href: string;
  label: string;
}

interface ModulePageTemplateFeature {
  icon: ReactNode;
  title: string;
  description: string;
}

interface ModulePageTemplateComparisonRow {
  item: string;
  baseline: string;
  module: string;
}

interface ModulePageTemplateProps {
  moduleName: string;
  theme?: ModuleTheme;
  hero: {
    badge: string;
    title: ReactNode;
    description: string;
    primaryCta: ModulePageTemplateCta;
    secondaryCta?: ModulePageTemplateCta;
    helperText?: string;
    /** Optional hero image rendered to the right of the text on desktop. */
    heroImage?: { src: string; alt: string };
  };
  demoPanel: {
    eyebrow?: string;
    title: string;
    description: string;
    bullets: string[];
    panelTitle: string;
    panelContent: ReactNode;
  };
  features: {
    eyebrow: string;
    title: string;
    items: ModulePageTemplateFeature[];
  };
  comparison: {
    eyebrow: string;
    title: string;
    baselineLabel: string;
    moduleLabel: string;
    rows: ModulePageTemplateComparisonRow[];
  };
  finalCta: {
    title: string;
    description: string;
    primaryCta: ModulePageTemplateCta;
    secondaryCta?: ModulePageTemplateCta;
  };
}

export default function ModulePageTemplate({
  moduleName,
  theme = "amber",
  hero,
  demoPanel,
  features,
  comparison,
  finalCta,
}: ModulePageTemplateProps) {
  const t = THEMES[theme];

  return (
    <div className="bg-zinc-950">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden ${t.heroBg} py-24 lg:py-32`}>
        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="module-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 60V0H60V60z" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#module-grid)" />
          </svg>
        </div>

        {hero.heroImage ? (
          /* ── Split layout: text left, image right ── */
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div className="space-y-8">
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${t.badgeClass}`}>
                <span className="text-xs font-black uppercase tracking-widest">{hero.badge}</span>
              </div>
              <h1 className={`text-5xl font-black leading-[1.05] sm:text-6xl lg:text-7xl ${t.heroText}`}>
                {hero.title}
              </h1>
              <p className={`text-xl font-medium leading-relaxed ${t.heroDesc}`}>
                {hero.description}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href={hero.primaryCta.href}
                  className={`rounded-2xl px-8 py-4 text-lg font-black transition-all hover:scale-105 ${t.primaryBtn}`}
                >
                  {hero.primaryCta.label}
                </Link>
                {hero.secondaryCta ? (
                  <Link
                    href={hero.secondaryCta.href}
                    className={`rounded-2xl border px-8 py-4 text-lg font-bold transition-colors ${t.secondaryBtn}`}
                  >
                    {hero.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
              {hero.helperText ? (
                <p className={`text-xs font-semibold ${t.helperText}`}>{hero.helperText}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-center">
              {/* Plain img — next/image requires Supabase domains in next.config */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.heroImage.src}
                alt={hero.heroImage.alt}
                className="w-full rounded-2xl object-cover shadow-2xl"
              />
            </div>
          </div>
        ) : (
          /* ── Centred layout (no image) ── */
          <div className="relative mx-auto flex max-w-6xl flex-col items-center space-y-8 px-4 text-center sm:px-6 lg:px-8">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${t.badgeClass}`}>
              <span className="text-xs font-black uppercase tracking-widest">{hero.badge}</span>
            </div>
            <h1 className={`max-w-4xl text-5xl font-black leading-[1.05] sm:text-6xl lg:text-7xl ${t.heroText}`}>
              {hero.title}
            </h1>
            <p className={`max-w-2xl text-xl font-medium leading-relaxed ${t.heroDesc}`}>
              {hero.description}
            </p>
            <div className="flex w-full flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
              <Link
                href={hero.primaryCta.href}
                className={`w-full rounded-2xl px-8 py-4 text-lg font-black transition-all hover:scale-105 sm:w-auto ${t.primaryBtn}`}
              >
                {hero.primaryCta.label}
              </Link>
              {hero.secondaryCta ? (
                <Link
                  href={hero.secondaryCta.href}
                  className={`w-full rounded-2xl border px-8 py-4 text-lg font-bold transition-colors sm:w-auto ${t.secondaryBtn}`}
                >
                  {hero.secondaryCta.label}
                </Link>
              ) : null}
            </div>
            {hero.helperText ? (
              <p className={`text-xs font-semibold ${t.helperText}`}>{hero.helperText}</p>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Demo panel ──────────────────────────────────────── */}
      <section className="bg-zinc-900 py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-5">
            {demoPanel.eyebrow ? (
              <p className={`text-xs font-black uppercase tracking-widest ${t.demoEyebrow}`}>
                {demoPanel.eyebrow}
              </p>
            ) : null}
            <h2 className="text-4xl font-black text-zinc-50">{demoPanel.title}</h2>
            <p className="text-lg font-medium text-zinc-400">{demoPanel.description}</p>
            <ul className="space-y-3">
              {demoPanel.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm font-semibold text-zinc-300">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${t.demoEyebrow.replace("text-", "bg-")}`} />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div className={`rounded-3xl border ${t.demoBorder} bg-zinc-950 p-6 shadow-2xl shadow-black/40`}>
            <p className={`mb-4 text-xs font-black uppercase tracking-widest ${t.demoEyebrow}`}>
              {demoPanel.panelTitle}
            </p>
            {demoPanel.panelContent}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="bg-zinc-950 py-24">
        <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 text-center">
            <p className={`text-xs font-black uppercase tracking-widest ${t.compEyebrow}`}>
              {features.eyebrow}
            </p>
            <h2 className="text-4xl font-black text-zinc-50">{features.title}</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.items.map((feature) => (
              <article
                key={feature.title}
                className={`space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition-all ${t.featureHover}`}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.featureIcon}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black text-zinc-50">{feature.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ────────────────────────────────── */}
      <section className="bg-zinc-950 py-24">
        <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 text-center">
            <p className={`text-xs font-black uppercase tracking-widest ${t.compEyebrow}`}>
              {comparison.eyebrow}
            </p>
            <h2 className="text-4xl font-black text-white">{comparison.title}</h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10">
            <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 px-6 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Scenario</p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                {comparison.baselineLabel}
              </p>
              <p className={`text-xs font-black uppercase tracking-widest ${t.compColHeader}`}>
                {comparison.moduleLabel}
              </p>
            </div>

            {comparison.rows.map((row, index) => (
              <div
                key={row.item}
                className={`grid grid-cols-3 gap-4 border-b border-white/5 px-6 py-5 last:border-0 ${
                  index % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]"
                }`}
              >
                <p className="text-sm font-bold text-slate-300">{row.item}</p>
                <p className="text-sm font-medium text-zinc-400">{row.baseline}</p>
                <p className={`text-sm font-bold ${t.compValue}`}>{row.module}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className={`${t.ctaBg} py-24`}>
        <div className="mx-auto max-w-4xl space-y-8 px-4 text-center sm:px-6 lg:px-8">
          <h2 className={`text-4xl font-black sm:text-5xl ${t.ctaText}`}>{finalCta.title}</h2>
          <p className={`text-xl font-medium ${t.ctaDesc}`}>{finalCta.description}</p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href={finalCta.primaryCta.href}
              className={`w-full rounded-2xl px-10 py-5 text-xl font-black transition-all hover:scale-105 sm:w-auto ${t.ctaPrimaryBtn}`}
            >
              {finalCta.primaryCta.label}
            </Link>
            {finalCta.secondaryCta ? (
              <Link
                href={finalCta.secondaryCta.href}
                className={`w-full rounded-2xl px-10 py-5 text-xl font-bold transition-colors sm:w-auto ${t.ctaSecondaryBtn}`}
              >
                {finalCta.secondaryCta.label}
              </Link>
            ) : null}
          </div>

          <p className={`text-xs font-semibold uppercase tracking-wider ${t.ctaModuleText}`}>
            {moduleName}
          </p>
        </div>
      </section>
    </div>
  );
}
