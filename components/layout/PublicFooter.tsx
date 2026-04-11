import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-slate-800/10 bg-slate-950 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-5 flex items-center gap-2">
              <div className="rounded-lg bg-amber-300 p-1 text-slate-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">Buildstate</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              The digital operations platform for civil site delivery. Built for project engineers, site supervisors, and contractors.
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Products</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/sitesign" className="text-sm text-slate-400 transition-colors hover:text-amber-300">
                  SiteSign — Gate sign-in
                </Link>
              </li>
              <li>
                <Link href="/siteplan" className="text-sm text-slate-400 transition-colors hover:text-amber-300">
                  SitePlan — Programme tracking
                </Link>
              </li>
              <li>
                <span className="text-sm text-slate-600">SiteCapture</span>
              </li>
              <li>
                <span className="text-sm text-slate-600">SiteITP</span>
              </li>
            </ul>
          </div>

          {/* Get started */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Get started</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/login?signup=1" className="text-sm text-amber-300 transition-colors hover:text-amber-200 font-medium">
                  Create your workspace
                </Link>
              </li>
              <li>
                <Link href="/login?signup=1&intent=sitesign" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Start with SiteSign
                </Link>
              </li>
              <li>
                <Link href="/login?signup=1&intent=siteplan" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Start with SitePlan
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 transition-colors hover:text-white">
                  View pricing
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Log in
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-slate-400 transition-colors hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Buildstate. All rights reserved.</p>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
            <span>Digital operations for civil construction delivery.</span>
            <Link href="/cms" className="text-slate-500 hover:text-slate-300 transition-colors" aria-label="Open content management">
              CMS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
