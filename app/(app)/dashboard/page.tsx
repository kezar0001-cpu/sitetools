"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

export default function DashboardHome() {
  const { loading } = useWorkspace({ requireAuth: true, requireCompany: true });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <section className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-300">SiteSign quick start</p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-3">Get your first crew sign-in today</h1>
        <p className="text-lg text-slate-300 font-medium max-w-2xl mt-4">
          Follow this setup once: create your site, print your QR poster, then track who is on site in real time.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/sites" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-amber-300 transition-colors">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Step 1</p>
          <h2 className="text-xl font-black text-slate-900 mt-2">Create your first site</h2>
          <p className="text-sm text-slate-600 mt-2">Add a site name and slug so SiteSign can generate a unique QR entry point.</p>
        </Link>

        <Link href="/dashboard/site-sign-in" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-amber-300 transition-colors">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Step 2</p>
          <h2 className="text-xl font-black text-slate-900 mt-2">Open SiteSign register</h2>
          <p className="text-sm text-slate-600 mt-2">View live attendance, add manual records, and keep your site register up to date.</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Need planning tools as well?</h2>
        <p className="text-sm text-slate-600 mt-2">SitePlan and additional Buildstate modules are available in secondary navigation once SiteSign is running.</p>
        <Link href="/dashboard/planner" className="inline-flex mt-4 text-sm font-bold text-indigo-700 hover:text-indigo-800">
          Explore SitePlan →
        </Link>
      </section>
    </div>
  );
}
