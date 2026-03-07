import { MODULES } from "@/lib/modules";
import { ModuleCard } from "@/components/modules/ModuleCard";
import Link from "next/link";

export default function LandingPage() {
    const liveModules = MODULES.filter((m) => m.status === "live");
    const comingSoonModules = MODULES.filter((m) => m.status === "coming-soon").slice(0, 3);

    return (
        <>
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden bg-slate-900 text-white">
                {/* Abstract background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 40V0H40V40z" fill="none" stroke="currentColor" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold text-xs uppercase tracking-wide mb-8">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        Buildstate Platform v1.0 Live
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                        The digital toolkit for <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                            civil construction teams
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                        Site Sign In, Site Diaries, ITPs, Inspections and more. Built for Australian contractors, engineers, and superintendents who need practical tools that actually work on site.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/login?signup=1"
                            className="w-full sm:w-auto px-8 py-4 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg"
                        >
                            Start using Buildstate today
                        </Link>
                        <a
                            href="#tools"
                            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-lg border border-slate-700 hover:border-slate-600"
                        >
                            Explore the tools
                        </a>
                    </div>
                </div>
            </section>

            {/* Social Proof Strip */}
            <section className="border-b border-gray-200 bg-white py-10">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Built for Australian civil contractors</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale select-none">
                        {/* Fake logos for layout purposes */}
                        <div className="text-2xl font-black font-serif">ACME CIVIL</div>
                        <div className="text-2xl font-black font-sans tracking-tight">PACIFIC EARTHWORKS</div>
                        <div className="text-2xl font-black font-mono italic">SYDNEY PIPELINES</div>
                        <div className="text-2xl font-black uppercase">Tier 1 Constructions</div>
                    </div>
                </div>
            </section>

            {/* The Tools Grid */}
            <section id="tools" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">One platform. All your site tools.</h2>
                        <p className="text-lg text-slate-600">
                            Stop juggling paper forms, messy spreadsheets, and disconnected apps. Buildstate gives your team a unified suite of modules that talk to each other.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* First render the live modules, then the coming soon ones */}
                        {liveModules.map((m) => <ModuleCard key={m.id} module={m} />)}
                        {comingSoonModules.map((m) => <ModuleCard key={m.id} module={m} />)}
                    </div>

                    <div className="mt-12 text-center">
                        <Link href="/tools" className="inline-flex items-center gap-2 text-amber-600 font-bold hover:text-amber-700 transition-colors group">
                            View all planned modules
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Feature Spotlight: Site Sign In */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold text-xs uppercase tracking-wide mb-6">
                                Now Live
                            </div>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">
                                Replace your messy paper site register today.
                            </h2>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                The Buildstate <strong>Site Sign In</strong> module is ready to use right now. Print a QR code, stick it on the site fence, and instantly get a real-time digital register of everyone on your site.
                            </p>

                            <ul className="space-y-6 mb-10">
                                <li className="flex gap-4">
                                    <div className="shrink-0 mt-1 bg-amber-100 text-amber-600 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">Fast QR Scanning</h4>
                                        <p className="text-slate-600 text-sm">Workers scan with their own phone camera. No apps to download, no hardware to buy.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="shrink-0 mt-1 bg-amber-100 text-amber-600 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">WhatsApp Checkout Nudges</h4>
                                        <p className="text-slate-600 text-sm">If visitors forget to sign out, our automated WhatsApp integration reminds them nicely before they leave site.</p>
                                    </div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="shrink-0 mt-1 bg-amber-100 text-amber-600 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">Instant Reports</h4>
                                        <p className="text-slate-600 text-sm">Export visitor logs to CSV, Excel, or PDF directly from your dashboard for easy auditing.</p>
                                    </div>
                                </li>
                            </ul>

                            <Link
                                href="/login?signup=1"
                                className="inline-flex px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-colors shadow-sm"
                            >
                                Set up your first site
                            </Link>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-amber-100 rounded-[2rem] transform rotate-3 scale-105 opacity-50"></div>
                            <div className="bg-white border-8 border-slate-900 rounded-[2rem] shadow-2xl relative overflow-hidden aspect-[4/3] flex items-center justify-center">
                                <div className="text-center p-8 space-y-4">
                                    <div className="mx-auto bg-slate-100 w-32 h-32 p-4 rounded-xl block border border-slate-200">
                                        {/* Placeholder for QR Image */}
                                        <svg className="w-full h-full text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm10-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10-2h6v6h-6v-6zm2 2v2h2v-2h-2z" /></svg>
                                    </div>
                                    <h5 className="font-extrabold text-slate-900 text-xl">Pacific Highway Upgrade</h5>
                                    <p className="text-slate-500 font-medium">Scan QR to Sign In</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 bg-amber-400">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-5xl font-black text-amber-950 mb-6 tracking-tight">
                        Stop guessing who is on site.
                    </h2>
                    <p className="text-xl text-amber-800 mb-10 font-medium leading-relaxed max-w-2xl mx-auto">
                        Get your entire team onto the Buildstate platform starting with our free Site Sign In module today.
                    </p>
                    <Link
                        href="/login?signup=1"
                        className="inline-block px-8 py-4 bg-amber-950 hover:bg-black text-amber-400 font-bold rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-lg"
                    >
                        Create your free account
                    </Link>
                </div>
            </section>
        </>
    );
}
