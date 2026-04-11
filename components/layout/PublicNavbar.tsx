"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { getPublicModules } from "@/lib/modules";

// Map module slugs to their dedicated public marketing page routes and accent colours.
const MODULE_PAGE_BY_SLUG: Record<string, { href: string; color: string; dot: string }> = {
  sitesign:    { href: "/sitesign",     color: "text-amber-600",  dot: "bg-amber-400"  },
  siteplan:    { href: "/siteplan",     color: "text-blue-600",   dot: "bg-blue-500"   },
  sitecapture: { href: "/site-capture", color: "text-sky-600",    dot: "bg-sky-500"    },
  siteitp:     { href: "/site-itp",     color: "text-violet-600", dot: "bg-violet-500" },
  sitedocs:    { href: "/site-docs",    color: "text-cyan-600",   dot: "bg-cyan-500"   },
};

export function PublicNavbar() {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [productsOpen, setProductsOpen] = useState(false);

  const products = getPublicModules().map((module) => {
    const meta = MODULE_PAGE_BY_SLUG[module.slug] ?? {
      href: `/sitesign`,
      color: "text-slate-700",
      dot: "bg-slate-400",
    };
    return {
      href: meta.href,
      name: module.name,
      desc: module.shortDescription,
      color: meta.color,
      dot: meta.dot,
    };
  });

  const closeMobileMenu = () => {
    mobileMenuRef.current?.removeAttribute("open");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="rounded-lg bg-slate-950 p-1.5 text-amber-300 transition-transform group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">Buildstate</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {/* Products dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                Products
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${productsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {productsOpen && (
                <div className="absolute left-0 top-10 w-80 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {products.map((p) => (
                    <Link
                      key={p.href}
                      href={p.href}
                      className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`} />
                      <div>
                        <p className={`text-sm font-bold ${p.color}`}>{p.name}</p>
                        <p className="text-xs font-medium text-slate-500">{p.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/free-tools"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Free tools
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Contact
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Log in
            </Link>
          </nav>

          {/* Right actions */}
          <div className="relative flex items-center gap-2">
            <Link
              href="/login?signup=1"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-amber-200 shadow-sm transition-all hover:scale-105 hover:bg-black sm:px-5"
            >
              Get started free
            </Link>

            {/* Mobile hamburger */}
            <details ref={mobileMenuRef} className="relative md:hidden">
              <summary className="cursor-pointer list-none rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                <span className="sr-only">Toggle navigation menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.25}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>

              <div className="absolute right-0 top-12 w-64 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link
                  onClick={closeMobileMenu}
                  href="/"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Home
                </Link>

                <div className="my-1 h-px bg-slate-100" />
                <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Products
                </p>

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

                <div className="my-1 h-px bg-slate-100" />
                <Link
                  onClick={closeMobileMenu}
                  href="/free-tools"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Free tools
                </Link>
                <Link
                  onClick={closeMobileMenu}
                  href="/pricing"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Pricing
                </Link>
                <Link
                  onClick={closeMobileMenu}
                  href="/contact"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Contact
                </Link>

                <div className="my-1 h-px bg-slate-100" />
                <Link
                  onClick={closeMobileMenu}
                  href="/login"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Log in
                </Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
