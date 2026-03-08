"use client";

import { useMemo, useState, useTransition } from "react";
import { CmsBlock, CmsBlockType, CmsPage } from "@/lib/cms/types";
import { createBlockTemplate, validateBlocks, isValidSlug } from "@/lib/cms/validation";

export function CmsPageEditorClient({
  initialPage,
  onSave,
}: {
  initialPage: CmsPage;
  onSave: (payload: Partial<CmsPage>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [page, setPage] = useState(initialPage);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!isValidSlug(page.slug)) errors.push("Slug must be lowercase path segments separated by '-' and '/'.");
    errors.push(...validateBlocks(page.blocks).errors);
    return errors;
  }, [page]);

  function updateBlock(idx: number, patch: Partial<CmsBlock>) {
    setPage((prev) => ({ ...prev, blocks: prev.blocks.map((b, i) => (i === idx ? ({ ...b, ...patch } as CmsBlock) : b)) }));
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    setPage((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.blocks.length) return prev;
      const next = [...prev.blocks];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, blocks: next };
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4 grid md:grid-cols-3 gap-3">
        <label className="text-sm font-semibold">Title<input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm font-semibold">Slug<input value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm font-semibold">Status<select value={page.status} onChange={(e) => setPage({ ...page, status: e.target.value as CmsPage["status"] })} className="mt-1 w-full border rounded p-2"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-semibold md:col-span-3">SEO title<input value={page.seo_title || ""} onChange={(e) => setPage({ ...page, seo_title: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm font-semibold md:col-span-3">SEO description<textarea value={page.seo_description || ""} onChange={(e) => setPage({ ...page, seo_description: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Page blocks</h2>
          <select onChange={(e) => {
            if (!e.target.value) return;
            setPage((prev) => ({ ...prev, blocks: [...prev.blocks, createBlockTemplate(e.target.value as CmsBlockType)] }));
            e.target.value = "";
          }} className="border rounded p-2 text-sm">
            <option value="">Add block…</option>
            {(["hero", "textMedia", "featureGrid", "productCards", "howItWorks", "faq", "cta", "roadmapGrid", "demoVideo", "richText"] as CmsBlockType[]).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          {page.blocks.map((block, idx) => (
            <article key={block.id} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{idx + 1}. {block.type}</p>
                <div className="flex gap-2">
                  <button type="button" className="px-2 py-1 border rounded" onClick={() => moveBlock(idx, -1)}>↑</button>
                  <button type="button" className="px-2 py-1 border rounded" onClick={() => moveBlock(idx, 1)}>↓</button>
                  <button type="button" className="px-2 py-1 border rounded" onClick={() => setPage((prev) => ({ ...prev, blocks: prev.blocks.flatMap((b, i) => i === idx ? [b, { ...b, id: crypto.randomUUID() }] : [b]) }))}>Duplicate</button>
                  <button type="button" className="px-2 py-1 border rounded" onClick={() => updateBlock(idx, { hidden: !block.hidden })}>{block.hidden ? "Show" : "Hide"}</button>
                  <button type="button" className="px-2 py-1 border rounded text-red-700" onClick={() => setPage((prev) => ({ ...prev, blocks: prev.blocks.filter((_, i) => i !== idx) }))}>Remove</button>
                </div>
              </div>
              <textarea
                value={JSON.stringify(block, null, 2)}
                onChange={(e) => {
                  try {
                    updateBlock(idx, JSON.parse(e.target.value));
                  } catch {
                    // keep typing without crashing
                  }
                }}
                className="w-full border rounded p-2 font-mono text-xs min-h-40"
              />
            </article>
          ))}
        </div>
      </div>

      {validationErrors.length ? <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm"><p className="font-bold">Validation issues</p><ul className="list-disc pl-5">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-60"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await onSave(page);
            setMessage(res.ok ? "Saved." : `Save failed: ${res.error || "Unknown error"}`);
          });
        }}
      >
        {pending ? "Saving..." : "Save page"}
      </button>
    </div>
  );
}
