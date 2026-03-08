"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CmsBlockType } from "@/lib/cms/types";

const BLOCK_TYPES: CmsBlockType[] = ["hero", "text_media", "feature_grid", "product_cards", "how_it_works", "faq", "cta", "roadmap_grid", "demo_video", "rich_text"];

function defaultBlockContent(type: CmsBlockType) {
  switch (type) {
    case "hero":
      return { headline: "", subheadline: "", primaryCta: { label: "", href: "" } };
    case "text_media":
      return { heading: "", body: "" };
    case "feature_grid":
      return { heading: "", features: [{ title: "", description: "" }] };
    case "product_cards":
      return { heading: "", cards: [{ title: "", description: "", ctaLabel: "", ctaHref: "" }] };
    case "how_it_works":
      return { heading: "", steps: [{ title: "", description: "" }] };
    case "faq":
      return { heading: "", items: [{ question: "", answer: "" }] };
    case "cta":
      return { heading: "", primaryCta: { label: "", href: "" } };
    case "roadmap_grid":
      return { heading: "", items: [{ name: "", summary: "", status: "planned" }] };
    case "demo_video":
      return { heading: "", videoUrl: "" };
    case "rich_text":
      return { heading: "", body: "" };
  }
}

export default function CmsDashboardPage() {
  const [token, setToken] = useState<string>("");
  type CmsPageRow = { id: string; title: string; slug: string; status: string; page_type: string; seo_title?: string; seo_description?: string; nav_visible?: boolean; footer_visible?: boolean };
  type CmsEditorBlock = { id?: string; type: CmsBlockType; title: string; isVisible: boolean; content: Record<string, unknown> };
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [selected, setSelected] = useState<CmsPageRow | null>(null);
  const [blocks, setBlocks] = useState<CmsEditorBlock[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? "");
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/cms/pages").then((r) => r.json()).then((data) => setPages(data.pages ?? []));
  }, [token]);

  const selectedPage = useMemo(() => pages.find((p) => p.id === selected?.id) ?? null, [pages, selected]);

  async function openPage(id: string) {
    const res = await fetch(`/api/cms/pages/${id}`);
    const data = await res.json();
    setSelected(data.page);
    setBlocks((data.blocks ?? []).map((b: { [key: string]: unknown }) => ({ ...b, type: b.block_type as CmsBlockType, isVisible: Boolean(b.is_visible) })) as CmsEditorBlock[]);
  }

  async function savePage() {
    if (!selected) return;
    await fetch(`/api/cms/pages/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        page: {
          title: selected.title,
          slug: selected.slug,
          status: selected.status,
          seo_title: selected.seo_title,
          seo_description: selected.seo_description,
          nav_visible: selected.nav_visible,
          footer_visible: selected.footer_visible,
          page_type: selected.page_type
        },
        blocks: blocks.map((b, idx) => ({ ...b, order_index: idx }))
      })
    });
    alert("Saved");
  }

  async function createPage() {
    const title = prompt("Page title");
    const slug = prompt("Slug (e.g. home)");
    if (!title || !slug) return;

    const res = await fetch("/api/cms/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, slug, status: "draft", navVisible: false, footerVisible: false })
    });
    const data = await res.json();
    setPages((prev) => [...prev, data.page]);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Internal CMS</h1>
          <p className="text-sm text-slate-600">Manage Buildstate public pages with reusable blocks.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/cms/settings" className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold">Global settings</Link>
          <Link href="/dashboard/cms/media" className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold">Media library</Link>
          <button onClick={createPage} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">New page</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-6">
        <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          {pages.map((page) => (
            <button key={page.id} onClick={() => openPage(page.id)} className={`w-full text-left p-3 rounded-lg border ${selectedPage?.id === page.id ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
              <p className="font-semibold text-slate-900">{page.title}</p>
              <p className="text-xs text-slate-500">/{page.slug} · {page.status}</p>
            </button>
          ))}
        </aside>

        {selected ? (
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" value={selected.title ?? ""} onChange={(e) => setSelected({ ...selected, title: e.target.value })} placeholder="Title" />
              <input className="border rounded-lg px-3 py-2" value={selected.slug ?? ""} onChange={(e) => setSelected({ ...selected, slug: e.target.value })} placeholder="Slug" />
              <select className="border rounded-lg px-3 py-2" value={selected.status ?? "draft"} onChange={(e) => setSelected({ ...selected, status: e.target.value })}>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <input className="border rounded-lg px-3 py-2" value={selected.page_type ?? "marketing"} onChange={(e) => setSelected({ ...selected, page_type: e.target.value })} placeholder="Page type" />
              <input className="border rounded-lg px-3 py-2 md:col-span-2" value={selected.seo_title ?? ""} onChange={(e) => setSelected({ ...selected, seo_title: e.target.value })} placeholder="SEO title" />
              <textarea className="border rounded-lg px-3 py-2 md:col-span-2" value={selected.seo_description ?? ""} onChange={(e) => setSelected({ ...selected, seo_description: e.target.value })} placeholder="SEO description" />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-900">Blocks</h2>
                <select className="border rounded-lg px-2 py-1 text-sm" onChange={(e) => {
                  const type = e.target.value as CmsBlockType;
                  if (!type) return;
                  setBlocks((prev) => [...prev, { type, title: `${type} block`, isVisible: true, content: defaultBlockContent(type) }]);
                  e.target.value = "";
                }}>
                  <option value="">Add block type</option>
                  {BLOCK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <div key={`${block.id ?? "new"}-${index}`} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                    <div className="flex gap-2 items-center">
                      <input className="border rounded px-2 py-1 flex-1" value={block.title ?? ""} onChange={(e) => setBlocks((prev) => prev.map((item, idx) => idx === index ? { ...item, title: e.target.value } : item))} />
                      <button className="text-xs border rounded px-2 py-1" onClick={() => setBlocks((prev) => prev.filter((_, idx) => idx !== index))}>Delete</button>
                      <button className="text-xs border rounded px-2 py-1" onClick={() => index > 0 && setBlocks((prev) => {
                        const copy = [...prev]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; return copy;
                      })}>↑</button>
                      <button className="text-xs border rounded px-2 py-1" onClick={() => index < blocks.length - 1 && setBlocks((prev) => {
                        const copy = [...prev]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; return copy;
                      })}>↓</button>
                    </div>
                    <p className="text-xs text-slate-500">{block.type}</p>
                    <textarea className="w-full border rounded p-2 font-mono text-xs" rows={8} value={JSON.stringify(block.content ?? {}, null, 2)} onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setBlocks((prev) => prev.map((item, idx) => idx === index ? { ...item, content: parsed } : item));
                      } catch {
                        // keep invalid while typing
                      }
                    }} />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={savePage} className="px-4 py-2 rounded-lg bg-amber-500 text-amber-950 font-bold">Save page</button>
          </section>
        ) : (
          <section className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">Select a page to edit.</section>
        )}
      </div>
    </div>
  );
}
