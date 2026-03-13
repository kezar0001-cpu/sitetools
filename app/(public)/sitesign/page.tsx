import Link from "next/link";

const steps = [
  {
    title: "Set up your site QR code",
    description: "Create a site sign-in point and display the QR at site entry. One poster for the whole gate.",
  },
  {
    title: "Workers scan and sign in",
    description: "Every worker checks in from their own phone in seconds. No apps for them to download.",
  },
  {
    title: "Track attendance and export",
    description: "Supervisors monitor live headcount and export signed registers for compliance in one click.",
  },
];

const benefits = [
  "Faster gate sign-in for crews and subcontractors",
  "Live onsite headcount visibility for supervisors",
  "Export-ready compliance records (CSV, XLSX, PDF)",
];

export default function SiteSignPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <section className="bg-amber-400 border-b border-amber-500 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 flex flex-col items-center text-center">
          <p className="text-sm uppercase tracking-[0.2em] font-bold text-amber-950/70">Buildstate SiteSign</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-amber-950 leading-tight">
            Stop the paperwork. <br />
            <span className="text-white/90">Sign in on mobile.</span>
          </h1>
          <p className="text-xl text-amber-950/80 max-w-2xl font-medium">
            Faster gate sign-in for civil crews. Live headcount at your fingertips. Export-ready compliance records in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full justify-center">
            <Link href="/login?signup=1&intent=sitesign" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-950 hover:bg-black text-amber-50 font-black text-lg transition-transform hover:scale-105 shadow-xl shadow-amber-950/20">
              Start SiteSign Free
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/20 hover:bg-white/30 text-amber-950 font-bold text-lg transition-colors backdrop-blur-sm border border-amber-950/10">
              Log In
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900">How it works</h2>
            <p className="text-slate-500 mt-2 font-medium">Simple, digital sign-in for every worker on site.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-transform hover:-translate-y-1">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-amber-950 font-black text-lg">
                  {index + 1}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-6">{step.title}</h3>
                <p className="text-slate-600 mt-3 font-medium leading-relaxed">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 border-y border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900">Built for civil delivery</h2>
            <p className="text-slate-500 mt-2 font-medium">Practical tools for the field, not just the office.</p>
          </div>
          <ul className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <li key={benefit} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6 font-bold text-amber-900 flex items-center gap-4">
                <div className="shrink-0 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-amber-300 bg-amber-400 p-12 text-center space-y-8 shadow-2xl shadow-amber-200">
            <h2 className="text-4xl font-black text-amber-950">Start using SiteSign on your next project.</h2>
            <p className="text-xl text-amber-950/70 font-medium">No credit card required. Set up your first site in minutes.</p>
            <div className="pt-4">
              <Link href="/login?signup=1&intent=sitesign" className="inline-flex px-10 py-5 rounded-xl bg-amber-950 hover:bg-black text-amber-50 font-black text-xl transition-transform hover:scale-105 shadow-xl shadow-amber-950/20">
                Start SiteSign Free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
