import Link from "next/link";
import { CmsBlock } from "@/lib/cms/types";

export function PublicBlockRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <div className="space-y-10 py-10">
      {blocks.filter((block) => block.isVisible).map((block) => {
        switch (block.type) {
          case "hero":
            return (
              <section key={block.id} className="bg-slate-950 text-white rounded-2xl p-10">
                {block.content.eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-amber-300">{block.content.eyebrow}</p>}
                <h1 className="text-4xl font-black mt-3">{block.content.headline}</h1>
                {block.content.subheadline && <p className="text-slate-300 mt-4 max-w-3xl">{block.content.subheadline}</p>}
                <div className="flex gap-3 mt-6 flex-wrap">
                  {block.content.primaryCta && (
                    <Link href={block.content.primaryCta.href} className="px-5 py-3 rounded-xl bg-amber-400 text-amber-950 font-bold">
                      {block.content.primaryCta.label}
                    </Link>
                  )}
                  {block.content.secondaryCta && (
                    <Link href={block.content.secondaryCta.href} className="px-5 py-3 rounded-xl border border-slate-500 text-white font-semibold">
                      {block.content.secondaryCta.label}
                    </Link>
                  )}
                </div>
              </section>
            );
          case "text_media":
            return (
              <section key={block.id} className="grid lg:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{block.content.heading}</h2>
                  <p className="mt-3 text-slate-600 whitespace-pre-line">{block.content.body}</p>
                </div>
                <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 text-sm text-slate-600">
                  {block.content.mediaUrl ? `Media: ${block.content.mediaUrl}` : "No media attached"}
                </div>
              </section>
            );
          case "feature_grid":
            return (
              <section key={block.id} className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {block.content.features.map((feature) => (
                    <article key={feature.title} className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="font-bold text-slate-900">{feature.title}</h3>
                      <p className="text-sm text-slate-600 mt-2">{feature.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "product_cards":
            return (
              <section key={block.id} className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {block.content.cards.map((card) => (
                    <article key={card.title} className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs uppercase tracking-wider text-slate-500">{card.status ?? ""}</p>
                      <h3 className="font-bold text-xl text-slate-900 mt-2">{card.title}</h3>
                      <p className="text-sm text-slate-600 mt-2">{card.description}</p>
                      <Link href={card.ctaHref} className="inline-flex mt-3 text-sm font-bold text-amber-700">{card.ctaLabel} →</Link>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "how_it_works":
            return (
              <section key={block.id} className="bg-white border border-slate-200 rounded-2xl p-8">
                <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>
                <ol className="mt-5 space-y-3">
                  {block.content.steps.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="h-7 w-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          case "faq":
            return (
              <section key={block.id} className="space-y-3">
                <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>
                {block.content.items.map((item) => (
                  <details key={item.question} className="bg-white border border-slate-200 rounded-xl p-4">
                    <summary className="font-semibold text-slate-900 cursor-pointer">{item.question}</summary>
                    <p className="text-sm text-slate-600 mt-2">{item.answer}</p>
                  </details>
                ))}
              </section>
            );
          case "cta":
            return (
              <section key={block.id} className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-black">{block.content.heading}</h2>
                  {block.content.body && <p className="text-slate-300 mt-2">{block.content.body}</p>}
                </div>
                <div className="flex gap-3">
                  <Link href={block.content.primaryCta.href} className="px-5 py-3 rounded-xl bg-amber-400 text-amber-950 font-bold">{block.content.primaryCta.label}</Link>
                  {block.content.secondaryCta && <Link href={block.content.secondaryCta.href} className="px-5 py-3 rounded-xl border border-slate-500">{block.content.secondaryCta.label}</Link>}
                </div>
              </section>
            );
          case "roadmap_grid":
            return (
              <section key={block.id} className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {block.content.items.map((item) => (
                    <article key={item.name} className="bg-white border border-slate-200 rounded-xl p-5">
                      <p className="text-xs uppercase tracking-wider text-slate-500">{item.status}</p>
                      <p className="font-semibold text-slate-900 mt-1">{item.name}</p>
                      <p className="text-sm text-slate-600 mt-2">{item.summary}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "demo_video":
            return (
              <section key={block.id} className="bg-white border border-slate-200 rounded-2xl p-8">
                <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>
                <p className="text-slate-600 mt-2">{block.content.intro}</p>
                <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Demo video URL: {block.content.videoUrl}</div>
              </section>
            );
          case "rich_text":
            return (
              <section key={block.id} className="bg-white border border-slate-200 rounded-2xl p-8">
                {block.content.heading && <h2 className="text-3xl font-black text-slate-900">{block.content.heading}</h2>}
                <p className="mt-3 text-slate-600 whitespace-pre-line">{block.content.body}</p>
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
