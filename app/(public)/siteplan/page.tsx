import Link from "next/link";

const steps = [
  {
    title: "Set up your programme",
    description: "Create project stages, milestones, and key delivery dates.",
  },
  {
    title: "Track delivery progress",
    description: "Update status regularly to see where work is ahead or behind plan.",
  },
  {
    title: "Coordinate weekly actions",
    description: "Use one planning view to align engineers, supervisors, and managers.",
  },
];

const benefits = [
  "Clear programme visibility for civil construction delivery",
  "Faster issue detection with milestone tracking",
  "Shared planning workflow across field and office teams",
];

export default function SitePlanPage() {
  return (
    <div className="min-h-full bg-blue-50">
      <section className="bg-blue-700 border-b border-blue-800 py-16 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-100">Buildstate SitePlan</p>
          <h1 className="text-4xl sm:text-5xl font-black">Planning and delivery tracking for civil construction programmes</h1>
          <p className="text-lg text-blue-100 max-w-3xl">
            SitePlan gives project teams a practical planning and delivery workflow to keep programmes current, visible, and actionable.
          </p>
          <Link href="/login?signup=1" className="inline-flex px-5 py-3 rounded-xl bg-white hover:bg-blue-100 text-blue-800 font-bold">
            Start SitePlan
          </Link>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-900">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-blue-200 bg-white p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold">{index + 1}</span>
                <h3 className="font-bold text-slate-900 mt-3">{step.title}</h3>
                <p className="text-slate-600 mt-2 text-sm">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 border-y border-blue-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <h2 className="text-3xl font-black text-slate-900">Benefits</h2>
          <ul className="grid md:grid-cols-3 gap-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 font-semibold text-slate-800">
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-blue-300 bg-blue-100 p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] font-bold text-blue-900">Ready to start?</p>
            <h2 className="text-2xl font-black text-blue-950 mt-2">Start using SitePlan with your next programme.</h2>
          </div>
          <Link href="/login?signup=1" className="inline-flex px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold">
            Start SitePlan
          </Link>
        </div>
      </section>
    </div>
  );
}
