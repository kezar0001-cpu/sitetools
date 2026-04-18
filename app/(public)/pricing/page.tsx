import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Buildstate",
  description: "Simple, transparent pricing for the Buildstate platform. Start free and scale with your site.",
};

const freeFeatures = [
  "1 Active site",
  "Unlimited worker sign-ins",
  "Live headcount dashboard",
  "CSV export",
  "Community support",
];

const proFeatures = [
  "Everything in Free",
  "Unlimited sites & projects",
  "Advanced PDF reports",
  "Digital signature capture",
  "SitePlan programme tracking",
  "SiteCapture & daily records",
  "SiteITP hold & witness points",
  "WhatsApp checkout reminders",
  "Priority email support",
];

const faq = [
  {
    q: "What counts as a 'site'?",
    a: "A site is a physical location where workers sign in. Each site gets its own QR code. On the free tier you can have 1 active site; Pro gives you unlimited sites.",
  },
  {
    q: "Do workers need to download anything?",
    a: "No. Workers scan the QR code with their phone's camera. No app, no account, no setup — they're signed in within 10 seconds.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no lock-in contracts. You can cancel from your account settings at any time and you won't be billed again.",
  },
  {
    q: "Does the free tier include SitePlan?",
    a: "SitePlan (programme planning) is included in the Pro tier. The free tier covers SiteSign (gate sign-in) with 1 active site.",
  },
  {
    q: "Do you offer pricing for large organisations?",
    a: "Yes — we have flexible arrangements for multiple projects, long-term frameworks, or custom integrations. Contact us to discuss your requirements.",
  },
];

export default function PricingPage() {
  return (
    <main className="bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50">
            Start free. Scale as you grow.
          </h1>
          <p className="text-xl text-zinc-400 font-medium max-w-2xl mx-auto">
            Simple, transparent pricing for civil teams of every size. No lock-in contracts, no hidden fees.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-zinc-50">Free</h2>
              <p className="text-zinc-400 text-sm mt-1">Perfect for trialling on a single site.</p>
            </div>
            <div className="text-4xl font-black text-zinc-50 mb-2">
              $0{" "}
              <span className="text-lg font-medium text-zinc-400">/ forever</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Free tier includes 1 active site</p>
            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-zinc-400 font-medium text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/login?signup=1"
              className="w-full py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-bold text-center transition-colors border border-zinc-700"
            >
              Start for free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-3xl border-2 border-amber-400 bg-zinc-900 p-8 relative flex flex-col">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-amber-400 text-amber-950 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-zinc-50">Workspace Pro</h2>
              <p className="text-zinc-400 text-sm mt-1">The full Buildstate suite for professional civil delivery.</p>
            </div>
            <div className="text-4xl font-black text-zinc-50 mb-2">
              $49{" "}
              <span className="text-lg font-medium text-zinc-400">/ project / month</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Billed monthly. Cancel anytime.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-zinc-400 font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/login?signup=1"
              className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-center transition-all hover:scale-105 shadow-lg shadow-amber-400/20"
            >
              Start Workspace Pro
            </Link>
          </div>
        </div>

        {/* What's included in Pro — module callout */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
          <h2 className="text-2xl font-black text-zinc-50">Pro includes the full Buildstate suite</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "SiteSign", color: "amber", desc: "Gate sign-in, headcount & compliance" },
              { name: "SitePlan", color: "blue", desc: "Programme planning & delivery tracking" },
              { name: "SiteCapture", color: "sky", desc: "Daily records, weather & site events" },
              { name: "SiteITP", color: "violet", desc: "Hold & witness point checklists" },
            ].map((m) => (
              <div
                key={m.name}
                className={`rounded-2xl border p-5 ${
                  m.color === "amber" ? "border-amber-400/30 bg-amber-400/10" :
                  m.color === "blue" ? "border-blue-400/30 bg-blue-400/10" :
                  m.color === "sky" ? "border-sky-400/30 bg-sky-400/10" :
                  "border-violet-400/30 bg-violet-400/10"
                }`}
              >
                <p className={`text-sm font-black mb-1 ${
                  m.color === "amber" ? "text-amber-400" :
                  m.color === "blue" ? "text-blue-400" :
                  m.color === "sky" ? "text-sky-400" :
                  "text-violet-400"
                }`}>{m.name}</p>
                <p className="text-xs text-zinc-400 font-medium">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl font-black text-zinc-50">Enterprise or framework pricing?</h2>
          <p className="text-zinc-400 font-medium">
            Multiple projects, long-term delivery frameworks, or custom integrations? We offer flexible pricing for large organisations and alliances.
          </p>
          <div className="pt-2">
            <Link href="/contact" className="text-amber-400 font-bold hover:text-amber-300 flex items-center justify-center gap-2">
              Contact our team
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-black text-zinc-50 text-center">Frequently asked questions</h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="font-black text-zinc-50 mb-2">{item.q}</p>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
