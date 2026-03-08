import Link from "next/link";
import { notFound } from "next/navigation";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import { getMediaMap, getPublishedPageBySlug } from "@/lib/cms/server";
import { getModule } from "@/lib/modules";


export async function generateMetadata({ params }: { params: { moduleId: string } }) {
  const page = await getPublishedPageBySlug(`tools/${params.moduleId}`);
  return {
    title: page?.seo_title || undefined,
    description: page?.seo_description || undefined,
    openGraph: {
      title: page?.og_title || page?.seo_title || undefined,
      description: page?.og_description || page?.seo_description || undefined,
    },
    alternates: page?.canonical_url ? { canonical: page.canonical_url } : undefined,
  };
}

export default async function ModulePage({ params }: { params: { moduleId: string } }) {
  const page = await getPublishedPageBySlug(`tools/${params.moduleId}`);
  if (page) {
    const mediaMap = await getMediaMap();
    return <CmsPageRenderer page={page} mediaMap={mediaMap} />;
  }

  const currentModule = getModule(params.moduleId);
  if (!currentModule) notFound();

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-4xl font-black">{currentModule.name}</h1>
      <p className="mt-3 text-slate-600">This module page is not yet configured in CMS.</p>
      <Link href="/dashboard/cms" className="inline-block mt-5 px-4 py-2 rounded-lg bg-slate-900 text-white">Open CMS editor</Link>
    </div>
  );
}
