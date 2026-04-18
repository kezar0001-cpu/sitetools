import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Buildstate",
  description: "How Buildstate collects, uses, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="bg-zinc-950 min-h-screen py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
        <h1 className="text-3xl font-black tracking-tight text-zinc-50">Privacy Policy</h1>
        <p className="text-sm text-zinc-500">Last updated: 8 March 2026</p>

        <section className="space-y-3 text-zinc-400 leading-relaxed">
          <p>
            We collect information required to deliver our services, including account details, usage data, and records
            entered by your team.
          </p>
          <p>
            We use this information to operate and improve Buildstate, provide support, secure accounts, and meet legal
            obligations. We do not sell personal information.
          </p>
          <p>
            You can request access or correction of your personal information by contacting{" "}
            <a className="text-amber-400 hover:text-amber-300" href="mailto:admin@buildstate.com.au">
              admin@buildstate.com.au
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
