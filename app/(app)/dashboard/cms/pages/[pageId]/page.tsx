import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CmsPageEditorClient } from "@/components/cms/CmsPageEditorClient";
import { getPageById, savePage } from "@/lib/cms/server";
import { CmsPage } from "@/lib/cms/types";

export default async function CmsPageEditor({ params }: { params: { pageId: string } }) {
  const page = await getPageById(params.pageId);
  if (!page) notFound();

  async function onSave(payload: Partial<CmsPage>) {
    "use server";
    const { error } = await savePage({ ...payload, id: params.pageId });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/cms/pages/${params.pageId}`);
    revalidatePath("/");
    revalidatePath("/tools");
    return { ok: true };
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <Link href="/dashboard/cms" className="text-sm text-slate-600 hover:text-slate-900">← Back to CMS pages</Link>
      <h1 className="text-2xl font-black">Edit page: {page.title}</h1>
      <CmsPageEditorClient initialPage={page} onSave={onSave} />
    </div>
  );
}
