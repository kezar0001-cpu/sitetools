import Link from "next/link";
import { redirect } from "next/navigation";

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

  return (
    <div className="bg-slate-50 min-h-full">
      <section className="bg-white border-b border-slate-200 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Buildstate</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 max-w-4xl">Operational tools for civil construction teams.</h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Buildstate is the umbrella platform connecting site attendance and planning workflows, with more site operations tools rolling out into one workspace.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-700">Buildstate SiteSign</p>
            <h2 className="text-3xl font-black text-slate-900 mt-3">QR sign-in and workforce attendance tracking for construction sites</h2>
            <Link href="/sitesign" className="inline-flex mt-6 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold">
              Go to SiteSign
            </Link>
          </article>

          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-7">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700">Buildstate SitePlan</p>
            <h2 className="text-3xl font-black text-slate-900 mt-3">Planning and delivery tracking for civil construction programmes</h2>
            <Link href="/siteplan" className="inline-flex mt-6 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Go to SitePlan
            </Link>
          </article>
        </div>
      </section>

      <section className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-200 bg-slate-50 p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-slate-700">Buildstate develops operational tools for civil construction teams.</p>
          <Link href="/workspace" className="inline-flex px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold">
            View workspace roadmap
          </Link>
        </div>
      </section>
    </div>
  );
}
