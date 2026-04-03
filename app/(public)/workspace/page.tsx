import Link from "next/link";

const liveProducts = ["SiteSign", "SitePlan"];
const plannedTools = ["SiteCapture", "ITP Builder", "Daily Inspections", "Plant & Equipment", "Incident Reports", "Labour & Timesheets"];

export default function WorkspacePage() {
  return (
    <div className="bg-slate-50 min-h-full py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Buildstate workspace roadmap</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mt-2">Buildstate ecosystem</h1>
          <p className="text-slate-600 mt-3 max-w-3xl">
            Buildstate combines live delivery tools with a planned suite of operational apps for civil construction teams.
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-2xl font-black text-slate-900">Live products</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3">
            {liveProducts.map((product) => (
              <li key={product} className="rounded-xl border border-emerald-200 bg-white px-4 py-3 font-semibold text-slate-800">
                {product}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black text-slate-900">Planned tools</h2>
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plannedTools.map((tool) => (
              <li key={tool} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                {tool}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-slate-700">Start with SiteSign today and add more Buildstate tools as your workspace grows.</p>
          <Link href="/sitesign" className="inline-flex px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold">
            Start SiteSign
          </Link>
        </section>
      </div>
    </div>
  );
}
