"use client";

import Link from "next/link";
import { useState } from "react";

type Step = "token" | "reset" | "done";

export function RecoverClient() {
  const [step, setStep] = useState<Step>("token");
  const [token, setToken] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: validate the recovery token ───────────────────────────────────
  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/cms/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token }),
    });

    const payload = (await response.json().catch(() => null)) as {
      username?: string;
      error?: string;
    } | null;

    setLoading(false);

    if (!response.ok || !payload?.username) {
      setError(payload?.error ?? "Unable to verify token.");
      return;
    }

    setCurrentUsername(payload.username);
    setNewUsername(payload.username);
    setStep("reset");
  }

  // ── Step 2: save new credentials ──────────────────────────────────────────
  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/cms/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", token, username: newUsername, password: newPassword }),
    });

    const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;

    setLoading(false);

    if (!response.ok) {
      setError(payload?.error ?? "Unable to save new credentials.");
      return;
    }

    setStep("done");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 py-20 min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/cms" className="bg-amber-400 text-amber-900 rounded-xl p-3 inline-block transition-transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recover CMS Access</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {step === "token" && "Enter your recovery token to continue."}
              {step === "reset" && `Current username: ${currentUsername}`}
              {step === "done" && "Your credentials have been updated."}
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Step 1 — token */}
        {step === "token" && (
          <>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              <p className="font-bold mb-1">How recovery works</p>
              <ol className="list-decimal list-inside space-y-1 font-medium">
                <li>Add <code className="bg-amber-100 rounded px-1">CMS_RECOVERY_TOKEN=&lt;secret&gt;</code> to your <code className="bg-amber-100 rounded px-1">.env.local</code> (min 16 chars).</li>
                <li>Restart the dev server.</li>
                <li>Come back here and enter that token.</li>
                <li>Set a new username and password.</li>
              </ol>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="recovery-token">
                  Recovery Token
                </label>
                <input
                  id="recovery-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  autoFocus
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
                  placeholder="Your CMS_RECOVERY_TOKEN value"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black disabled:opacity-70 text-white font-bold px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg mt-2 text-sm"
              >
                {loading ? "Verifying…" : "Verify Token"}
              </button>
            </form>
          </>
        )}

        {/* Step 2 — reset */}
        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="new-username">
                New Username
              </label>
              <input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={3}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="new-password">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black disabled:opacity-70 text-white font-bold px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg mt-2 text-sm"
            >
              {loading ? "Saving…" : "Save New Credentials"}
            </button>
          </form>
        )}

        {/* Step 3 — done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-4 text-sm font-semibold text-center">
              Credentials updated successfully!
            </div>
            <Link
              href="/cms"
              className="block w-full text-center bg-slate-900 hover:bg-black text-white font-bold px-4 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg text-sm"
            >
              Go to CMS Login
            </Link>
          </div>
        )}

        {/* Back link */}
        {step !== "done" && (
          <p className="text-center text-xs text-slate-500 font-medium pt-2">
            <Link href="/cms" className="text-amber-600 hover:text-amber-700 font-bold">
              Back to CMS login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
