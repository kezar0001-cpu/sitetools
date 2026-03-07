import Link from "next/link";
import { getLiveModules } from "@/lib/modules";

export function PublicNavbar() {
    const liveModules = getLiveModules();

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="bg-amber-400 text-amber-900 rounded-lg p-1.5 transition-transform group-hover:scale-105">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-slate-900">Buildstate</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6">
                            {liveModules.map((m) => (
                                <Link
                                    key={m.id}
                                    href={`/tools/${m.id}`}
                                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    {m.name}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/login?signup=1"
                            className="bg-amber-400 hover:bg-amber-500 text-amber-900 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                            Get Started Free
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
