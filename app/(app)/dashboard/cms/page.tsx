import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getAllPages, savePage } from "@/lib/cms/server";

async function createPage(formData: FormData) {
  "use server";
  const title = String(formData.get("title") || "New page");
  const slug = String(formData.get("slug") || "");
  await savePage({
    title,
    slug,
    internal_label: title,
    page_type: "marketing",
    status: "draft",
    nav_visible: false,
    page_order: 99,
    blocks: [],
  });
  revalidatePath("/dashboard/cms");
}

export default async function CmsDashboardPage() {
  const pages = await getAllPages();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">CMS Content Manager</h1>
          <p className="text-slate-600">Manage pages, block sections, media, SEO, and global settings.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/cms/media" className="px-4 py-2 rounded-lg border border-slate-300">Media library</Link>
          <Link href="/dashboard/cms/settings" className="px-4 py-2 rounded-lg border border-slate-300">Global settings</Link>
        </div>
      </div>

      <form action={createPage} className="bg-white rounded-xl border p-4 grid md:grid-cols-3 gap-3 items-end">
        <label className="text-sm font-semibold">Title<input name="title" className="mt-1 w-full border rounded-lg p-2" required /></label>
        <label className="text-sm font-semibold">Slug (empty for homepage)<input name="slug" className="mt-1 w-full border rounded-lg p-2" placeholder="tools/site-sign-in" /></label>
        <button className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold">Create page</button>
      </form>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left p-3">Title</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Status</th><th className="text-left p-3">Updated</th><th className="p-3"></th></tr></thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t">
                <td className="p-3 font-semibold">{page.title}</td>
                <td className="p-3 font-mono text-xs">/{page.slug}</td>
                <td className="p-3 capitalize">{page.status}</td>
                <td className="p-3">{new Date(page.updated_at).toLocaleString()}</td>
                <td className="p-3 text-right"><Link href={`/dashboard/cms/pages/${page.id}`} className="px-3 py-1.5 rounded border">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
