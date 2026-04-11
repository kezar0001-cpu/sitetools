import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Buildstate",
  description: "Buildstate builds practical workspace tools for civil construction teams.",
};

export default function AboutPage() {
  return (
    <main className="bg-zinc-950 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
        <h1 className="text-3xl font-black tracking-tight text-zinc-50">About Buildstate</h1>
        <p className="text-zinc-400 leading-relaxed">
          Buildstate creates practical software for civil construction teams. Our products help site supervisors,
          engineers, and delivery teams track attendance, planning, and field records in one connected workspace.
        </p>
        <p className="text-zinc-400 leading-relaxed">
          We focus on simple tools that are fast to adopt on live projects and reliable for day-to-day operations.
        </p>
      </div>
    </main>
  );
}
