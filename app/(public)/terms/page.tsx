import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Buildstate",
  description: "Terms governing use of Buildstate products and services.",
};

export default function TermsPage() {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Terms of Service</h1>
        <p className="text-sm text-slate-500">Last updated: 8 March 2026</p>

        <section className="space-y-3 text-slate-700 leading-relaxed">
          <p>
            By using Buildstate, you agree to use the platform lawfully and protect your account credentials. You are
            responsible for activity under your account.
          </p>
          <p>
            Buildstate provides software tools for operational workflows. You must verify project decisions and records
            generated from the platform before relying on them for contractual or compliance purposes.
          </p>
          <p>
            We may update, suspend, or discontinue features at any time. To the extent permitted by law, Buildstate is
            provided on an “as is” basis without warranties of uninterrupted service.
          </p>
          <p>
            Questions about these terms can be sent to{" "}
            <a className="text-amber-700 hover:text-amber-800" href="mailto:support@buildstate.com">
              support@buildstate.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
