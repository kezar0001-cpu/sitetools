import Link from "next/link";
import { getSiteSettings } from "@/lib/cms/server";

export async function PublicFooter() {
  const settings = await getSiteSettings();
  const footerColumns = settings?.footer_columns?.length
    ? settings.footer_columns
    : [
        { heading: "Products", links: [{ label: "SiteSign", href: "/tools/site-sign-in" }, { label: "SitePlan", href: "/tools/planner" }] },
        { heading: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
      ];

  return (
    <footer className="mt-16 border-t border-slate-800/10 bg-slate-950 pt-16 pb-8 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="text-xl font-extrabold">{settings?.site_title || "Buildstate"}</Link>
            <p className="text-sm leading-relaxed text-slate-400 mt-3">{settings?.brand_tagline || "Operational workspace products for civil contractors."}</p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">{column.heading}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.href}`}><Link href={link.href} className="text-sm text-slate-400 hover:text-white">{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-xs text-slate-500">{settings?.legal_text || `© ${new Date().getFullYear()} Buildstate. All rights reserved.`}</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
