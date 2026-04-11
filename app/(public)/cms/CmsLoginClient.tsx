"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function CmsLoginClient() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("password") === "updated") {
      toast.success("Password updated");
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/cms/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to log in.");
      return;
    }

    window.location.href = "/cms/admin";
  }

  async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError(null);
    setResetLoading(true);

    const { error: resetRequestError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/cms/reset`,
    });

    setResetLoading(false);

    if (resetRequestError) {
      setResetError(resetRequestError.message);
      return;
    }

    toast.success("Check your email for reset instructions");
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CMS Admin Login</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Separate login area for your CMS workspace.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="cms-username">
              Admin Username
            </label>
            <input
              id="cms-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full min-h-12 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="cms-password">
              Admin Password
            </label>
            <input
              id="cms-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full min-h-12 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 bg-slate-900 hover:bg-black disabled:opacity-70 text-white font-bold px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg mt-2 text-sm"
          >
            {loading ? "Logging in..." : "Log in to CMS"}
          </button>
        </form>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword((value) => !value);
              setResetError(null);
            }}
            className="min-h-12 w-full text-center text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Forgot Password?
          </button>
        </div>

        {showForgotPassword && (
          <form onSubmit={handleResetSubmit} className="space-y-4 border-t border-slate-200 pt-4">
            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{resetError}</div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="cms-reset-email">
                Admin Email
              </label>
              <input
                id="cms-reset-email"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
                className="w-full min-h-12 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
                placeholder="admin@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full min-h-12 bg-amber-400 hover:bg-amber-300 disabled:opacity-70 text-amber-950 font-bold px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg text-sm"
            >
              {resetLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
