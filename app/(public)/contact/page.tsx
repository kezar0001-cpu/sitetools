import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Buildstate",
  description: "Contact Buildstate support and product team.",
};

export default function ContactPage() {
  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Contact</h1>
        <p className="text-slate-700 leading-relaxed">
          For product support, account help, or partnership enquiries, contact our team and we will respond as soon
          as possible.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-2 text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Support email:</span>{" "}
            <a className="text-amber-700 hover:text-amber-800" href="mailto:admin@buildstate.com.au">
              admin@buildstate.com.au
            </a>
          </p>
          <p>
            <span className="font-semibold text-slate-900">Business hours:</span> Monday to Friday, 9:00 AM to 5:00 PM
            (AEST)
          </p>
          <p>
            <span className="font-semibold text-slate-900">Company:</span> Buildstate
          </p>
        </div>
      </div>
    </main>
  );
}
