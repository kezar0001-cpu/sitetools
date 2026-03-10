import Link from "next/link";

const steps = [
  {
    title: "Set up your site QR code",
    description: "Create a site sign-in point and display the QR at site entry.",
  },
  {
    title: "Workers scan and sign in",
    description: "Every worker checks in from their own phone in seconds.",
  },
  {
    title: "Track attendance and export",
    description: "Supervisors monitor who is onsite and export records when needed.",
  },
];

const benefits = [
  "Fast sign-in for crews and subcontractors",
  "Live workforce visibility for supervisors",
  "Digital records for compliance and payroll support",
];

export default function SiteSignPage() {
  return (
    <div className="min-h-full bg-amber-50">
      <section className="bg-amber-300 border-b border-amber-400 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-900">Buildstate SiteSign</p>
          <h1 className="text-4xl sm:text-5xl font-black text-amber-950">QR Sign-In for Construction Sites</h1>
          <p className="text-lg text-amber-950/90 max-w-3xl">
            SiteSign helps civil construction teams run quick QR sign-in and maintain reliable workforce attendance records across active sites.
          </p>
          <Link href="/login?signup=1&intent=sitesign" className="inline-flex px-5 py-3 rounded-xl bg-amber-950 hover:bg-black text-amber-100 font-bold">
            Start SiteSign
          </Link>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-900">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-amber-200 bg-white p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-bold">
                  {index + 1}
                </span>
                <h3 className="font-bold text-slate-900 mt-3">{step.title}</h3>
                <p className="text-slate-600 mt-2 text-sm">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 border-y border-amber-200 bg-white">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl border border-amber-300 bg-amber-100 p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] font-bold text-amber-900">Ready to start?</p>
            <h2 className="text-2xl font-black text-amber-950 mt-2">Start using SiteSign on your next project.</h2>
          </div>
          <Link href="/login?signup=1&intent=sitesign" className="inline-flex px-5 py-3 rounded-xl bg-amber-950 hover:bg-black text-amber-100 font-bold">
            Start SiteSign
          </Link>
        </div>
      </section>
    </div>
  );
}
