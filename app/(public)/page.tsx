import { Metadata } from "next";
import { PublicBlockRenderer } from "@/components/cms/PublicBlockRenderer";
import { DEFAULT_HOME_BLOCKS } from "@/lib/cms/defaults";
import { getCmsSettings, getPublishedPageBySlug } from "@/lib/cms/server";

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPublishedPageBySlug("home"), getCmsSettings()]);
  return {
    title: page?.seoTitle ?? settings.defaultSeoTitle,
    description: page?.seoDescription ?? settings.defaultSeoDescription
  };
}

export default async function LandingPage() {
  const page = await getPublishedPageBySlug("home");
  const blocks = page?.blocks?.length ? page.blocks : DEFAULT_HOME_BLOCKS;

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PublicBlockRenderer blocks={blocks} />
      </div>
    </div>
  );
}
