import { redirect } from "next/navigation";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import { getMediaMap, getPublishedPageBySlug } from "@/lib/cms/server";


export async function generateMetadata() {
  const page = await getPublishedPageBySlug("");
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

interface LandingPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const resolvedSiteSlug =
    getFirstQueryValue(searchParams?.site) ??
    getFirstQueryValue(searchParams?.slug) ??
    getFirstQueryValue(searchParams?.siteSlug) ??
    getFirstQueryValue(searchParams?.site_id);

  if (resolvedSiteSlug) {
    const forwardParams = new URLSearchParams();
    forwardParams.set("site", resolvedSiteSlug);
    redirect(`/sign-in?${forwardParams.toString()}`);
  }

  const page = await getPublishedPageBySlug("");
  if (!page) {
    return <div className="py-20 px-4 max-w-4xl mx-auto"><h1 className="text-3xl font-black">CMS homepage not published</h1><p className="text-slate-600 mt-2">Publish the page with slug <code>/</code> in Dashboard → CMS.</p></div>;
  }

  const mediaMap = await getMediaMap();
  return <CmsPageRenderer page={page} mediaMap={mediaMap} />;
}
