"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const products = [
  {
    href: "/sitesign",
    name: "SiteSign",
    desc: "QR gate sign-in & live headcount",
    color: "text-amber-600",
    dot: "bg-amber-400",
  },
  {
    href: "/siteplan",
    name: "SitePlan",
    desc: "Programme planning & delivery tracking",
    color: "text-blue-600",
    dot: "bg-blue-500",
  },
];

export function PublicNavbar() {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [productsOpen, setProductsOpen] = useState(false);

  const closeMobileMenu = () => {
    mobileMenuRef.current?.removeAttribute("open");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/10 bg-white/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5 shrink-0">
            <div className="rounded-lg bg-slate-950 p-1.5 text-amber-300 transition-transform group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">Buildstate</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Products dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                Products
                <svg className={`h-3.5 w-3.5 transition-transform ${productsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {productsOpen && (
                <div className="absolute left-0 top-10 w-72 rounded-2xl border border-slate-200 bg-white shadow-lg p-2 space-y-1">
                  {products.map((p) => (
                    <Link
                      key={p.href}
                      href={p.href}
                      className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${p.dot} shrink-0 mt-1.5`} />
                      <div>
                        <p className={`text-sm font-bold ${p.color}`}>{p.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{p.desc}</p>
                      </div>
                    </Link>
                  ))}
                  <div className="border-t border-slate-100 pt-2 px-3 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">SiteCapture · SiteITP · Coming soon</p>
                  </div>
                </div>
              )}
            </div>

            <Link href="/pricing" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              Pricing
            </Link>
            <Link href="/contact" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              Contact
            </Link>
            <Link href="/login" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              Log in
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 relative">
            <Link
              href="/login?signup=1"
              className="rounded-xl bg-slate-950 px-4 sm:px-5 py-2.5 text-sm font-bold text-amber-200 shadow-sm transition-all hover:bg-black hover:scale-105"
            >
              Get started free
            </Link>

            {/* Mobile hamburger */}
            <details ref={mobileMenuRef} className="md:hidden relative">
              <summary className="list-none cursor-pointer p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <span className="sr-only">Toggle navigation menu</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white shadow-lg p-2 space-y-1">
                <Link onClick={closeMobileMenu} href="/" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Home</Link>
                <div className="h-px bg-slate-100 my-1" />
                <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Products</p>
                {products.map((p) => (
                  <Link
                    key={p.href}
                    onClick={closeMobileMenu}
                    href={p.href}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-bold ${p.color} hover:bg-slate-50`}
                  >
                    {p.name}
                  </Link>
                ))}
                <div className="h-px bg-slate-100 my-1" />
                <Link onClick={closeMobileMenu} href="/pricing" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Pricing</Link>
                <Link onClick={closeMobileMenu} href="/contact" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Contact</Link>
                <div className="h-px bg-slate-100 my-1" />
                <Link onClick={closeMobileMenu} href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Log in</Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
