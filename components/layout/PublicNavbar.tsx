import Link from "next/link";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/10 bg-white/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-3">
              <div className="rounded-lg bg-slate-950 p-1.5 text-amber-300 transition-transform group-hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-base font-black tracking-tight text-slate-900">Buildstate</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Workspace Apps</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/tools/site-sign-in" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                SiteSign
              </Link>
              <Link href="/tools/planner" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                SitePlan
              </Link>
              <Link href="/tools" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                Workspace Apps
              </Link>
              <Link href="/about" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                About
              </Link>
              <Link href="/contact" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                Contact
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-600 transition-colors hover:text-slate-900">
              Log in
            </Link>
            <Link href="/login?signup=1" className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-amber-200 shadow-sm transition-colors hover:bg-black">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
