import Link from "next/link";
import { getLiveModules, getComingSoonModules } from "@/lib/modules";

export function PublicFooter() {
    const liveModules = getLiveModules();
    const comingSoonModules = getComingSoonModules();

    return (
        <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Col */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="bg-amber-400 text-amber-900 rounded-lg p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-white">Buildstate</span>
                        </Link>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            Practical digital tools for Australian civil contractors, engineers, and construction teams.
                        </p>
                    </div>

                    {/* Tools Col */}
                    <div className="col-span-1">
                        <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Active Tools</h3>
                        <ul className="space-y-3">
                            {liveModules.map((m) => (
                                <li key={m.id}>
                                    <Link href={`/tools/${m.id}`} className="text-slate-400 hover:text-amber-400 text-sm transition-colors">
                                        {m.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Coming Soon</h3>
                        <ul className="space-y-3">
                            {comingSoonModules.slice(0, 4).map((m) => (
                                <li key={m.id}>
                                    <span className="text-slate-500 text-sm cursor-not-allowed">
                                        {m.name}
                                    </span>
                                </li>
                            ))}
                            <li><Link href="/tools" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">See all tools &rarr;</Link></li>
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Company</h3>
                        <ul className="space-y-3">
                            <li><Link href="/about" className="text-slate-400 hover:text-white text-sm transition-colors">About</Link></li>
                            <li><Link href="/contact" className="text-slate-400 hover:text-white text-sm transition-colors">Contact</Link></li>
                            <li><Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors">Log In</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-xs">
                        &copy; {new Date().getFullYear()} Buildstate. All rights reserved. ABN XX XXX XXX XXX
                    </p>
                    <div className="flex gap-4 text-xs text-slate-500 hover:text-slate-400 transition-colors">
                        <Link href="/terms">Terms of Service</Link>
                        <Link href="/privacy">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
