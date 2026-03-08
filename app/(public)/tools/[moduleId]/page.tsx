import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicBlockRenderer } from "@/components/cms/PublicBlockRenderer";
import { getModule } from "@/lib/modules";
import { getCmsSettings, getPublishedPageBySlug } from "@/lib/cms/server";
import { DEFAULT_HOME_BLOCKS } from "@/lib/cms/defaults";

function getCmsSlug(moduleId: string) {
  if (moduleId === "site-sign-in") return "sitesign";
  if (moduleId === "planner") return "siteplan";
  return "";
}

export async function generateMetadata({ params }: { params: { moduleId: string } }): Promise<Metadata> {
  const settings = await getCmsSettings();
  const slug = getCmsSlug(params.moduleId);
  const page = slug ? await getPublishedPageBySlug(slug) : null;

  return {
    title: page?.seoTitle ?? settings.defaultSeoTitle,
    description: page?.seoDescription ?? settings.defaultSeoDescription
  };
}

export default async function ModulePage({ params }: { params: { moduleId: string } }) {
  const moduleItem = getModule(params.moduleId);
  if (!moduleItem) notFound();

  const slug = getCmsSlug(params.moduleId);
  const page = slug ? await getPublishedPageBySlug(slug) : null;

  return (
    <div className="bg-slate-50 min-h-full py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link href="/tools" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to workspace tools</Link>
        {page ? (
          <PublicBlockRenderer blocks={page.blocks} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <h1 className="text-3xl font-black text-slate-900">{moduleItem.name}</h1>
            <p className="text-slate-600 mt-3">CMS page not published yet. You can configure this page from Dashboard → CMS.</p>
            <div className="mt-5">
              <PublicBlockRenderer blocks={DEFAULT_HOME_BLOCKS.slice(0, 2)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
