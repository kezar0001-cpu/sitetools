import { CmsBlockRenderer } from "@/components/cms/CmsBlockRenderer";
import { CmsPage, CmsMedia } from "@/lib/cms/types";

export function CmsPageRenderer({ page, mediaMap }: { page: CmsPage; mediaMap: Record<string, CmsMedia> }) {
  return <>{page.blocks.map((block) => <CmsBlockRenderer key={block.id} block={block} mediaMap={mediaMap} />)}</>;
}
