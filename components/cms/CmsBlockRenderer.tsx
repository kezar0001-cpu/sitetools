import Image from "next/image";
import Link from "next/link";
import { CmsBlock, CmsMedia } from "@/lib/cms/types";

function pickMedia(mediaMap: Record<string, CmsMedia>, id?: string) {
  return id ? mediaMap[id] : undefined;
}

export function CmsBlockRenderer({ block, mediaMap }: { block: CmsBlock; mediaMap: Record<string, CmsMedia> }) {
  if (block.hidden) return null;

  switch (block.type) {
    case "hero": {
      const media = pickMedia(mediaMap, block.mediaId);
      return (
        <section className={block.theme === "light" ? "bg-white py-20" : "bg-slate-950 text-white py-20"}>
          <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
            <div className={block.align === "center" ? "text-center lg:text-left" : ""}>
              {block.eyebrow ? <p className="text-xs uppercase tracking-widest font-bold text-amber-400">{block.eyebrow}</p> : null}
              <h1 className="text-4xl md:text-5xl font-black mt-2">{block.headline}</h1>
              {block.subheadline ? <p className="mt-4 text-slate-300">{block.subheadline}</p> : null}
              <div className="mt-6 flex flex-wrap gap-3">
                {block.primaryCtaText && block.primaryCtaHref ? <Link className="px-5 py-3 rounded-xl bg-amber-400 text-slate-900 font-bold" href={block.primaryCtaHref}>{block.primaryCtaText}</Link> : null}
                {block.secondaryCtaText && block.secondaryCtaHref ? <Link className="px-5 py-3 rounded-xl border border-slate-500" href={block.secondaryCtaHref}>{block.secondaryCtaText}</Link> : null}
              </div>
            </div>
            {media ? <Image src={media.public_url} alt={media.alt_text || block.headline} width={1200} height={800} className="w-full rounded-2xl border border-slate-800" /> : null}
          </div>
        </section>
      );
    }
    case "textMedia": {
      const media = pickMedia(mediaMap, block.mediaId);
      const mediaNode = media ? <Image src={media.public_url} alt={media.alt_text || block.heading} width={1000} height={700} className="w-full rounded-2xl border border-slate-200" /> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">No media selected</div>;
      return <section className="py-14 bg-white"><div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">{block.mediaSide === "left" ? mediaNode : null}<div><h2 className="text-3xl font-black">{block.heading}</h2><p className="mt-3 text-slate-600 whitespace-pre-line">{block.body}</p></div>{block.mediaSide !== "left" ? mediaNode : null}</div></section>;
    }
    case "featureGrid":
      return <section className="py-14 bg-slate-50"><div className="max-w-7xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2>{block.subheading ? <p className="text-slate-600 mt-2">{block.subheading}</p> : null}<div className="mt-6 grid md:grid-cols-3 gap-4">{block.items.map((i) => <article key={i.title} className="bg-white border border-slate-200 rounded-xl p-5"><h3 className="font-bold">{i.title}</h3><p className="text-sm text-slate-600 mt-2">{i.description}</p></article>)}</div></div></section>;
    case "productCards":
      return <section className="py-14 bg-white"><div className="max-w-7xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2>{block.subheading ? <p className="text-slate-600 mt-2">{block.subheading}</p> : null}<div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">{block.cards.map((card) => <article key={card.title} className="border rounded-xl p-5 bg-slate-50"><p className="font-black">{card.title}</p>{card.status ? <p className="text-xs uppercase text-amber-700 font-bold mt-1">{card.status}</p> : null}<p className="text-sm text-slate-600 mt-2">{card.description}</p>{card.ctaHref && card.ctaText ? <Link href={card.ctaHref} className="inline-block mt-4 text-sm font-bold text-slate-900">{card.ctaText} →</Link> : null}</article>)}</div></div></section>;
    case "howItWorks":
      return <section className="py-14 bg-slate-50"><div className="max-w-5xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2>{block.intro ? <p className="text-slate-600 mt-2">{block.intro}</p> : null}<ol className="mt-5 space-y-3">{block.steps.map((step, idx) => <li key={step.title} className="bg-white border rounded-xl p-4"><p className="font-bold">{idx + 1}. {step.title}</p><p className="text-sm text-slate-600 mt-1">{step.description}</p></li>)}</ol></div></section>;
    case "faq":
      return <section className="py-14 bg-white"><div className="max-w-5xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2><div className="mt-5 space-y-3">{block.items.map((item) => <details key={item.question} className="border rounded-xl p-4 bg-slate-50"><summary className="font-bold cursor-pointer">{item.question}</summary><p className="mt-2 text-sm text-slate-600">{item.answer}</p></details>)}</div></div></section>;
    case "cta":
      return <section className="py-14 bg-slate-900 text-white"><div className="max-w-5xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2>{block.body ? <p className="mt-2 text-slate-300">{block.body}</p> : null}<div className="mt-5 flex gap-3"> <Link href={block.primaryCtaHref} className="px-5 py-3 bg-amber-400 text-slate-950 rounded-xl font-bold">{block.primaryCtaText}</Link>{block.secondaryCtaText && block.secondaryCtaHref ? <Link href={block.secondaryCtaHref} className="px-5 py-3 border border-slate-500 rounded-xl">{block.secondaryCtaText}</Link> : null}</div></div></section>;
    case "roadmapGrid":
      return <section className="py-14 bg-white"><div className="max-w-6xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2><div className="mt-6 grid md:grid-cols-3 gap-4">{block.items.map((item) => <article key={item.title} className="border rounded-xl p-5"><p className="font-bold">{item.title}</p><p className="text-sm mt-1 text-slate-600">{item.description}</p>{item.status ? <p className="text-xs mt-2 uppercase text-slate-500">{item.status}</p> : null}</article>)}</div></div></section>;
    case "demoVideo": {
      const video = pickMedia(mediaMap, block.videoMediaId);
      const poster = pickMedia(mediaMap, block.posterMediaId);
      return <section className="py-14 bg-slate-50"><div className="max-w-5xl mx-auto px-4"><h2 className="text-3xl font-black">{block.heading}</h2>{block.body ? <p className="text-slate-600 mt-2">{block.body}</p> : null}{video ? <video className="mt-5 w-full rounded-2xl border" controls poster={poster?.public_url}><source src={video.public_url} type={video.mime_type || "video/mp4"} /></video> : null}</div></section>;
    }
    case "richText":
      return <section className="py-14 bg-white"><div className="max-w-4xl mx-auto px-4">{block.heading ? <h2 className="text-3xl font-black">{block.heading}</h2> : null}<div className="mt-3 whitespace-pre-line text-slate-700">{block.content}</div></div></section>;
  }
}
