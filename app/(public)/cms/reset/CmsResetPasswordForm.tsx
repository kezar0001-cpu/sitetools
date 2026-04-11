"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CmsResetPasswordFormProps = {
  accessToken: string;
};

export function CmsResetPasswordForm({ accessToken }: CmsResetPasswordFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: accessToken,
      type: "recovery",
      options: { password: newPassword },
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.replace("/cms?password=updated");
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Set new CMS password</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Enter and confirm your new password below.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="cms-new-password">
              New Password
            </label>
            <input
              id="cms-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              className="w-full min-h-12 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="cms-confirm-password">
              Confirm Password
            </label>
            <input
              id="cms-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm font-medium text-slate-500">
            Back to{" "}
            <Link href="/cms" className="font-bold text-amber-600 hover:text-amber-700 hover:underline">
              CMS login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
