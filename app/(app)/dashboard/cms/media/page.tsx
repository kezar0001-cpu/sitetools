import Image from "next/image";
import { getMediaLibrary } from "@/lib/cms/server";

export default async function CmsMediaPage() {
  const media = await getMediaLibrary();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-black">Media library</h1>
      <form action="/api/cms/media-upload" method="post" encType="multipart/form-data" className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-3 items-end">
        <label className="text-sm font-semibold">Label<input name="label" className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm font-semibold">Alt text<input name="alt_text" className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm font-semibold md:col-span-2">File<input type="file" name="file" className="mt-1 w-full" required /></label>
        <button className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold w-fit">Upload</button>
      </form>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item) => (
          <article key={item.id} className="bg-white border rounded-xl p-3 space-y-2">
            {item.media_type === "image" ? (
              <Image src={item.public_url} alt={item.alt_text || item.label} width={400} height={260} className="w-full h-36 object-cover rounded-lg" />
            ) : (
              <video className="w-full h-36 object-cover rounded-lg" src={item.public_url} controls />
            )}
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="text-xs text-slate-500 font-mono break-all">{item.id}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
