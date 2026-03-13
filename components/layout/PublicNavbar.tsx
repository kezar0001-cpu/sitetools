"use client";

import Link from "next/link";
import { useRef } from "react";

export function PublicNavbar() {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  const closeMobileMenu = () => {
    mobileMenuRef.current?.removeAttribute("open");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/10 bg-white/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="group flex items-center gap-3">
            <div className="rounded-lg bg-slate-950 p-1.5 text-amber-300 transition-transform group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-base font-black tracking-tight text-slate-900">Buildstate</p>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/sitesign" className="text-sm font-semibold text-amber-600 hover:text-amber-800">SiteSign</Link>
            <Link href="/siteplan" className="text-sm font-semibold text-blue-600 hover:text-blue-800">SitePlan</Link>
            <Link href="/pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/contact" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Contact</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Log in</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 relative">
            <Link href="/login?signup=1&intent=sitesign" className="rounded-xl bg-slate-950 px-3 sm:px-5 py-2.5 text-sm font-bold text-amber-200 shadow-sm transition-colors hover:bg-black">
              Start SiteSign
            </Link>

            <details ref={mobileMenuRef} className="md:hidden relative">
              <summary className="list-none cursor-pointer p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <span className="sr-only">Toggle navigation menu</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-slate-200 bg-white shadow-sm p-2 space-y-1">
                <Link onClick={closeMobileMenu} href="/" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Home</Link>
                <Link onClick={closeMobileMenu} href="/sitesign" className="block rounded-lg px-3 py-2.5 text-sm font-bold text-amber-600 bg-amber-50 hover:bg-amber-100">SiteSign</Link>
                <Link onClick={closeMobileMenu} href="/siteplan" className="block rounded-lg px-3 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100">SitePlan</Link>
                <Link onClick={closeMobileMenu} href="/pricing" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Pricing</Link>
                <Link onClick={closeMobileMenu} href="/contact" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Contact</Link>
                <div className="h-px bg-slate-100 my-1"></div>
                <Link onClick={closeMobileMenu} href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Log in</Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
