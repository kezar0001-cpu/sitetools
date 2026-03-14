"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getIcon } from "@/components/icons/getIcon";

export default function ResetConfirmPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Supabase exchanges the magic-link tokens from the URL fragment automatically.
        // We listen for the PASSWORD_RECOVERY event to confirm the session is ready.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setReady(true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        setInfo("Password updated! Redirecting to login…");
        setTimeout(() => router.replace("/login"), 2000);
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 py-20 min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 space-y-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Link href="/" className="bg-amber-400 text-amber-900 rounded-xl p-3 inline-block transition-transform hover:scale-105">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Set new password</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Enter and confirm your new password below.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
                        {getIcon("alert-triangle", "h-5 w-5 shrink-0 mt-0.5")}
                        {error}
                    </div>
                )}

                {info && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
                        {getIcon("list-checks", "h-5 w-5 shrink-0 mt-0.5")}
                        {info}
                    </div>
                )}

                {!ready && !info && (
                    <p className="text-sm text-slate-500 text-center">Verifying your reset link…</p>
                )}

                {ready && !info && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="password">New Password</label>
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="confirm">Confirm Password</label>
                            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder="••••••••" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black disabled:opacity-70 text-white font-bold px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg mt-2 text-sm">
                            {loading ? "Updating…" : "Update Password"}
                        </button>
                    </form>
                )}

                <div className="text-center pt-2">
                    <p className="text-sm font-medium text-slate-500">
                        Back to{" "}
                        <Link href="/login" className="font-bold text-amber-600 hover:text-amber-700 hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
