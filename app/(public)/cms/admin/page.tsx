import Link from "next/link";
import { redirect } from "next/navigation";

import { isCmsAuthenticated } from "@/lib/cms/auth";
import { HeroMediaSettingsForm } from "./HeroMediaSettingsForm";
import { getPublicMediaSlot, getPublicVideoSlot } from "@/lib/publicSiteMedia";
import { readCmsHeroMediaSettings } from "@/lib/cms/heroMediaSettings";

export default async function CmsAdminPage() {
  if (!isCmsAuthenticated()) {
    redirect("/cms");
  }

  const defaultVideo = getPublicVideoSlot("siteSignHeroBackground");
  const defaultImage = getPublicMediaSlot("siteSignHeroCardImage");
  const heroMediaSettings = await readCmsHeroMediaSettings({
    heroVideoUrl: defaultVideo.src,
    heroVideoPosterUrl: defaultVideo.poster,
    heroCardImageUrl: defaultImage.src,
  });

  return (
    <div className="flex-1 bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm p-8 sm:p-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CMS</p>
            <h1 className="text-3xl font-black text-slate-900 mt-1">Admin Workspace</h1>
          </div>
          <form action="/api/cms/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-sm font-semibold">You are now in your separate /cms admin area.</p>
          <p className="text-sm mt-2">
            Use this page as a starting point and expand it over time as you add CMS sections.
          </p>
        </div>

        <HeroMediaSettingsForm initialValues={heroMediaSettings} />

        <div>
          <Link href="/" className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline">
            Return to main site
          </Link>
        </div>
      </div>
    </div>
  );
}
