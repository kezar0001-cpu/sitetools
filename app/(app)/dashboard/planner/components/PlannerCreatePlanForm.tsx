"use client";

import { FormEvent, useMemo, useState } from "react";
import { Project, Site } from "@/lib/workspace/types";

interface Props {
  projects: Project[];
  sites: Site[];
  creating: boolean;
  onCreate: (input: {
    name: string;
    description: string;
    projectId: string | null;
    siteIds: string[];
    withStarter: boolean;
  }) => Promise<void>;
}

export function PlannerCreatePlanForm({ projects, sites, creating, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [withStarter, setWithStarter] = useState(true);

  const canSubmit = useMemo(() => name.trim().length >= 3, [name]);

  const toggleSite = (siteId: string) => {
    setSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || creating) return;

    await onCreate({
      name: name.trim(),
      description,
      projectId: projectId || null,
      siteIds,
      withStarter,
    });

    setName("");
    setDescription("");
    setProjectId("");
    setSiteIds([]);
    setWithStarter(true);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Create new plan</h3>
        <p className="text-sm text-slate-500">Attach plan to project/site and start tracking immediately.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">
          Plan name
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Street Upgrade Programme" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Project (optional)
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No linked project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="text-sm font-medium text-slate-700 block">
        Description
        <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope, constraints, sequencing notes..." />
      </label>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Attach sites</p>
        <div className="flex flex-wrap gap-2">
          {sites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => toggleSite(site.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${siteIds.includes(site.id) ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white text-slate-600 border-slate-300"}`}
            >
              {site.name}
            </button>
          ))}
          {sites.length === 0 && <p className="text-sm text-slate-500">No sites available yet.</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={withStarter} onChange={(e) => setWithStarter(e.target.checked)} />
        Seed with civil starter activities (mobilisation, excavation, conduits, concrete, defects)
      </label>

      <button disabled={!canSubmit || creating} className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50">
        {creating ? "Creating..." : "Create plan"}
      </button>
    </form>
  );
}
