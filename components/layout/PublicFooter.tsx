import Link from "next/link";
import { getCmsSettings } from "@/lib/cms/server";

export async function PublicFooter() {
  const settings = await getCmsSettings();

  return (
    <footer className="mt-16 border-t border-slate-800/10 bg-slate-950 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-amber-300 p-1 text-slate-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">{settings.siteTitle}</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">{settings.defaultSeoDescription}</p>
          </div>

          {settings.footerColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{column.heading}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-xs text-slate-500">{settings.legalText}</p>
          <div className="flex gap-4 text-xs text-slate-500 transition-colors hover:text-slate-400">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
