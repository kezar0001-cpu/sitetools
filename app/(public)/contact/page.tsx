import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Buildstate",
  description: "Contact the Buildstate team for product support, account help, or partnership enquiries.",
};

export default function ContactPage() {
  return (
    <main className="bg-zinc-950 min-h-screen">
      <section className="border-b border-zinc-800 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">Contact</p>
          <h1 className="text-4xl font-black text-zinc-50 sm:text-5xl">Get in touch.</h1>
          <p className="max-w-xl text-lg font-medium leading-relaxed text-zinc-400">
            For product support, account help, or partnership enquiries, our team will respond as soon
            as possible during business hours.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Email */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Support email</p>
                <a
                  href="mailto:admin@buildstate.com.au"
                  className="text-amber-300 font-semibold text-sm transition-colors hover:text-amber-200 break-all"
                >
                  admin@buildstate.com.au
                </a>
              </div>
            </div>

            {/* Business hours */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Business hours</p>
                <p className="text-zinc-300 font-semibold text-sm">Monday – Friday</p>
                <p className="text-zinc-400 text-sm">9:00 AM – 5:00 PM AEST</p>
              </div>
            </div>

            {/* Company */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Company</p>
                <p className="text-zinc-300 font-semibold text-sm">Buildstate</p>
                <p className="text-zinc-400 text-sm">Australia</p>
              </div>
            </div>
          </div>

          {/* Topics */}
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-7 space-y-5">
            <h2 className="text-xl font-black text-zinc-50">What can we help with?</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Product support",
                  desc: "Questions about how a module works, setup help, or troubleshooting a specific feature.",
                },
                {
                  title: "Account & billing",
                  desc: "Help with workspace settings, subscription changes, or billing queries.",
                },
                {
                  title: "Enterprise & partnerships",
                  desc: "Multi-project pricing, framework arrangements, or custom integration requirements.",
                },
              ].map((item) => (
                <div key={item.title} className="space-y-1.5">
                  <p className="text-sm font-black text-zinc-200">{item.title}</p>
                  <p className="text-xs font-medium leading-relaxed text-zinc-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Self-serve nudge */}
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="space-y-1">
              <p className="text-base font-black text-zinc-50">Already have a workspace?</p>
              <p className="text-sm font-medium text-zinc-400">
                Log in and manage your projects, team, and settings directly from your dashboard.
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-amber-950 transition-all hover:scale-105 hover:bg-amber-300"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
