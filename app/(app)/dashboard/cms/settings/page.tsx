import { revalidatePath } from "next/cache";
import { getSiteSettings, saveSiteSettings } from "@/lib/cms/server";

async function saveSettings(formData: FormData) {
  "use server";
  await saveSiteSettings({
    site_title: String(formData.get("site_title") || "Buildstate"),
    brand_tagline: String(formData.get("brand_tagline") || ""),
    announcement_text: String(formData.get("announcement_text") || ""),
    announcement_link: String(formData.get("announcement_link") || ""),
    legal_text: String(formData.get("legal_text") || ""),
    nav_items: JSON.parse(String(formData.get("nav_items") || "[]")),
    footer_columns: JSON.parse(String(formData.get("footer_columns") || "[]")),
    social_links: JSON.parse(String(formData.get("social_links") || "[]")),
  });
  revalidatePath("/");
}

export default async function CmsSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-black">Global site settings</h1>
      <form action={saveSettings} className="mt-5 bg-white border rounded-xl p-4 space-y-4">
        <label className="block text-sm font-semibold">Site title<input name="site_title" defaultValue={settings?.site_title || "Buildstate"} className="mt-1 w-full border rounded p-2" /></label>
        <label className="block text-sm font-semibold">Brand tagline<input name="brand_tagline" defaultValue={settings?.brand_tagline || ""} className="mt-1 w-full border rounded p-2" /></label>
        <label className="block text-sm font-semibold">Announcement text<input name="announcement_text" defaultValue={settings?.announcement_text || ""} className="mt-1 w-full border rounded p-2" /></label>
        <label className="block text-sm font-semibold">Announcement link<input name="announcement_link" defaultValue={settings?.announcement_link || ""} className="mt-1 w-full border rounded p-2" /></label>
        <label className="block text-sm font-semibold">Legal footer text<input name="legal_text" defaultValue={settings?.legal_text || ""} className="mt-1 w-full border rounded p-2" /></label>
        <label className="block text-sm font-semibold">Nav items JSON<textarea name="nav_items" defaultValue={JSON.stringify(settings?.nav_items || [], null, 2)} className="mt-1 w-full border rounded p-2 font-mono text-xs min-h-28" /></label>
        <label className="block text-sm font-semibold">Footer columns JSON<textarea name="footer_columns" defaultValue={JSON.stringify(settings?.footer_columns || [], null, 2)} className="mt-1 w-full border rounded p-2 font-mono text-xs min-h-32" /></label>
        <label className="block text-sm font-semibold">Social links JSON<textarea name="social_links" defaultValue={JSON.stringify(settings?.social_links || [], null, 2)} className="mt-1 w-full border rounded p-2 font-mono text-xs min-h-24" /></label>
        <button className="px-4 py-2 rounded-lg bg-slate-900 text-white">Save settings</button>
      </form>
    </div>
  );
}
