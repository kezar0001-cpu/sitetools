import Link from "next/link";
import { getSiteSettings } from "@/lib/cms/server";

export async function PublicNavbar() {
  const settings = await getSiteSettings();
  const navItems = settings?.nav_items?.length
    ? settings.nav_items
    : [
        { label: "SiteSign", href: "/tools/site-sign-in" },
        { label: "SitePlan", href: "/tools/planner" },
        { label: "Workspace Apps", href: "/tools" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-300 p-1 text-slate-900">B</div>
          <div>
            <p className="text-base font-black tracking-tight text-slate-900">{settings?.site_title || "Buildstate"}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Workspace Apps</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link key={`${item.label}-${item.href}`} href={item.href} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900">Log in</Link>
          <Link href="/login?signup=1" className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-amber-200 hover:bg-black">Create account</Link>
        </div>
      </div>
      {settings?.announcement_text ? (
        <div className="bg-amber-100 text-amber-900 text-sm py-2 px-4 text-center border-t border-amber-200">
          {settings.announcement_link ? <Link href={settings.announcement_link}>{settings.announcement_text}</Link> : settings.announcement_text}
        </div>
      ) : null}
    </header>
  );
}
