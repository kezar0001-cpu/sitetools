import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | SiteSign",
  description: "Simple, transparent pricing for SiteSign.",
};

export default function PricingPage() {
  return (
    <main className="bg-slate-50 min-h-screen py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            SiteSign is built for civil projects of all sizes. Choice of project-based or fixed company pricing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Free Tier</h2>
              <p className="text-slate-500 text-sm mt-1">Perfect for small sites and trials.</p>
            </div>
            <div className="text-4xl font-black text-slate-900 mb-6">$0 <span className="text-lg font-medium text-slate-500">/ forever</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {["1 Active Site", "Unlimited Workers", "Standard Sign-in/out", "CSV Exports", "Community Support"].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-slate-700 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/login?signup=1&intent=sitesign" className="w-full py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-center transition-colors">
              Start for Free
            </Link>
          </div>

          <div className="bg-white rounded-3xl border-2 border-amber-400 p-8 shadow-xl relative flex flex-col">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-amber-400 text-amber-950 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Recommended
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Project Pro</h2>
              <p className="text-slate-500 text-sm mt-1">For professional civil delivery.</p>
            </div>
            <div className="text-4xl font-black text-slate-900 mb-2">$49 <span className="text-lg font-medium text-slate-500">/ project / month</span></div>
            <p className="text-xs text-slate-400 mb-6">Billed monthly. Cancel anytime.</p>
            <ul className="space-y-4 mb-8 flex-1">
              {[
                "Everything in Free",
                "Unlimited Projects & Sites",
                "Advanced PDF Reports",
                "Signature Capture",
                "WhatsApp Reminders",
                "Priority Email Support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-slate-700 font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/login?signup=1&intent=sitesign" className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-center transition-transform hover:scale-105 shadow-lg shadow-amber-200">
              Start SiteSign Pro
            </Link>
          </div>
        </div>

        <div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Enterprise or Custom Needs?</h2>
          <p className="text-slate-600 font-medium">
            Multiple projects, long-term frameworks, or custom integrations? We offer flexible pricing for large organizations.
          </p>
          <div className="pt-2">
            <Link href="/contact" className="text-amber-600 font-bold hover:text-amber-700 flex items-center justify-center gap-2">
              Contact our sales team
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
