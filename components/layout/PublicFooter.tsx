import Link from "next/link";

const products = [
  { href: "/sitesign",     name: "SiteSign",     desc: "QR gate sign-in & attendance"    },
  { href: "/siteplan",     name: "SitePlan",     desc: "Programme planning & tracking"   },
  { href: "/site-capture", name: "SiteCapture",  desc: "Daily records & site diary"      },
  { href: "/site-itp",     name: "SiteITP",      desc: "Hold & witness point checklists" },
  { href: "/site-docs",    name: "SiteDocs",     desc: "Document control & approvals"    },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 pb-8 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="mb-5 flex items-center gap-2">
              <div className="rounded-lg bg-amber-300 p-1 text-zinc-950">
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
              <span className="text-xl font-extrabold tracking-tight text-white">Buildstate</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
              The digital operations platform for civil site delivery. Built for project engineers,
              site supervisors, and contractors.
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Products</h3>
            <ul className="space-y-3">
              {products.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="group flex flex-col transition-colors"
                  >
                    <span className="text-sm font-semibold text-zinc-300 transition-colors group-hover:text-amber-300">
                      {p.name}
                    </span>
                    <span className="text-xs text-zinc-500 transition-colors group-hover:text-zinc-400">
                      {p.desc}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/free-tools"
                  className="text-sm font-semibold text-zinc-400 transition-colors hover:text-amber-300"
                >
                  Free tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Get started */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Get started</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/login?signup=1"
                  className="text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200"
                >
                  Create your workspace →
                </Link>
              </li>
              <li>
                <Link
                  href="/login?signup=1&intent=sitesign"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Start with SiteSign
                </Link>
              </li>
              <li>
                <Link
                  href="/login?signup=1&intent=siteplan"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Start with SitePlan
                </Link>
              </li>
              <li>
                <Link
                  href="/login?signup=1&intent=sitecapture"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Start with SiteCapture
                </Link>
              </li>
              <li>
                <Link
                  href="/login?signup=1&intent=siteitp"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Start with SiteITP
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  View pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-8 md:flex-row">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} Buildstate. All rights reserved.
          </p>
          <p className="text-xs font-medium text-zinc-600">
            Digital operations for civil construction delivery.
          </p>
        </div>
      </div>
    </footer>
  );
}
