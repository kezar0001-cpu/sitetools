import Link from "next/link";
import { ReactNode } from "react";

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
  hero: {
    badge: string;
    title: ReactNode;
    description: string;
    primaryCta: ModulePageTemplateCta;
    secondaryCta?: ModulePageTemplateCta;
    helperText?: string;
  };
  demoPanel: {
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
  hero,
  demoPanel,
  features,
  comparison,
  finalCta,
}: ModulePageTemplateProps) {
  return (
    <div className="bg-zinc-950">
      <section className="relative overflow-hidden bg-amber-400 py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="module-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 60V0H60V60z" fill="none" stroke="black" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#module-grid)" />
          </svg>
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center space-y-8 px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-950/10 bg-amber-950/10 px-4 py-2">
            <span className="text-xs font-black uppercase tracking-widest text-amber-950/70">{hero.badge}</span>
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.05] text-amber-950 sm:text-6xl lg:text-7xl">{hero.title}</h1>
          <p className="max-w-2xl text-xl font-medium leading-relaxed text-amber-950/75">{hero.description}</p>
          <div className="flex w-full flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link
              href={hero.primaryCta.href}
              className="w-full rounded-2xl bg-amber-950 px-8 py-4 text-lg font-black text-amber-50 shadow-2xl shadow-amber-950/20 transition-all hover:scale-105 hover:bg-black active:scale-95 sm:w-auto"
            >
              {hero.primaryCta.label}
            </Link>
            {hero.secondaryCta ? (
              <Link
                href={hero.secondaryCta.href}
                className="w-full rounded-2xl border border-amber-950/10 bg-white/25 px-8 py-4 text-lg font-bold text-amber-950 backdrop-blur-sm transition-colors hover:bg-white/35 sm:w-auto"
              >
                {hero.secondaryCta.label}
              </Link>
            ) : null}
          </div>
          {hero.helperText ? <p className="text-xs font-semibold text-amber-950/50">{hero.helperText}</p> : null}
        </div>
      </section>

      <section className="bg-zinc-900 py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-5">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">Demo panel</p>
            <h2 className="text-4xl font-black text-zinc-50">{demoPanel.title}</h2>
            <p className="text-lg font-medium text-zinc-400">{demoPanel.description}</p>
            <ul className="space-y-2">
              {demoPanel.bullets.map((bullet) => (
                <li key={bullet} className="text-sm font-semibold text-zinc-300">
                  • {bullet}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200/40 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
            <p className="mb-4 text-xs font-black uppercase tracking-widest text-amber-400">{demoPanel.panelTitle}</p>
            {demoPanel.panelContent}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 py-24">
        <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">{features.eyebrow}</p>
            <h2 className="text-4xl font-black text-zinc-50">{features.title}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.items.map((feature) => (
              <article key={feature.title} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition-colors hover:border-amber-200 hover:bg-amber-50/20">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">{feature.icon}</div>
                <h3 className="text-lg font-black text-zinc-50">{feature.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 py-24">
        <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">{comparison.eyebrow}</p>
            <h2 className="text-4xl font-black text-white">{comparison.title}</h2>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 px-6 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Scenario</p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{comparison.baselineLabel}</p>
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">{comparison.moduleLabel}</p>
            </div>
            {comparison.rows.map((row, index) => (
              <div key={row.item} className={`grid grid-cols-3 gap-4 border-b border-white/5 px-6 py-5 last:border-0 ${index % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]"}`}>
                <p className="text-sm font-bold text-slate-300">{row.item}</p>
                <p className="text-sm font-medium text-zinc-400">{row.baseline}</p>
                <p className="text-sm font-bold text-amber-300">{row.module}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-amber-400 py-24">
        <div className="mx-auto max-w-4xl space-y-8 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-amber-950 sm:text-5xl">{finalCta.title}</h2>
          <p className="text-xl font-medium text-amber-950/70">{finalCta.description}</p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href={finalCta.primaryCta.href}
              className="w-full rounded-2xl bg-amber-950 px-10 py-5 text-xl font-black text-amber-50 shadow-2xl shadow-amber-950/20 transition-all hover:scale-105 hover:bg-black active:scale-95 sm:w-auto"
            >
              {finalCta.primaryCta.label}
            </Link>
            {finalCta.secondaryCta ? (
              <Link
                href={finalCta.secondaryCta.href}
                className="w-full rounded-2xl bg-amber-300/70 px-10 py-5 text-xl font-bold text-amber-950 transition-colors hover:bg-amber-200 sm:w-auto"
              >
                {finalCta.secondaryCta.label}
              </Link>
            ) : null}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-950/60">{moduleName}</p>
        </div>
      </section>
    </div>
  );
}
