import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HeroMediaForm } from "./sections/HeroMediaForm";

const CMS_COOKIE_NAME = "cms_admin_session";

export default function CmsAdminPage() {
  const token = cookies().get(CMS_COOKIE_NAME)?.value;
  const expectedToken = process.env.CMS_ADMIN_SESSION_TOKEN ?? "local-dev-cms-token";

  if (!token || token !== expectedToken) {
    redirect("/cms");
  }

  return (
    <div className="flex-1 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CMS</p>
            <h1 className="text-3xl font-black text-slate-900 mt-1">Hero Media</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Update the homepage hero background video and hero card image. Saves go live immediately and fall back to defaults if unset.
            </p>
          </div>
          <form action="/api/cms/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </header>

        <Suspense>
          <HeroMediaForm />
        </Suspense>
      </div>
    </div>
  );
}
