"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, FolderPlus, BarChart3, ChevronRight, Loader2 } from "lucide-react";
import { useCompanyId } from "@/hooks/useSitePlan";
import { useHierarchicalImport } from "@/hooks/useSitePlanTasks";
import { createProject } from "@/lib/workspace/client";
import { sitePlanKeys } from "@/lib/queryKeys";
import { SITEPLAN_TEMPLATES } from "@/lib/siteplan/templateFixtures";
import type { TemplateId } from "@/lib/siteplan/templateFixtures";

// ─── Hero ────────────────────────────────────────────────────

function SitePlanHero() {
  return (
    <div className="flex flex-col items-center text-center pt-10 pb-8 px-4">
      {/* Illustrated icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
          <ClipboardList className="h-10 w-10 text-blue-500" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-2 w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
          <BarChart3 className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Build your first construction programme
      </h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Plan every phase, assign tasks to trades, and track real-time progress — all in one place.
      </p>
    </div>
  );
}

// ─── 3-step onboarding path ──────────────────────────────────

const STEPS = [
  {
    icon: FolderPlus,
    label: "Create a project",
    detail: "Name your project and choose a starter template",
  },
  {
    icon: ClipboardList,
    label: "Add phases and tasks",
    detail: "Break the work into phases with dates and responsible trades",
  },
  {
    icon: BarChart3,
    label: "Track progress in real time",
    detail: "Update task completion and spot delays at a glance",
  },
];

function OnboardingSteps() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-4">
        How it works
      </p>
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex-1 flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="h-4 w-4 text-blue-500" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 mb-0.5">
                  <span className="text-blue-500 mr-1">{i + 1}.</span>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400 leading-snug">{step.detail}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="hidden sm:block flex-shrink-0 self-center h-4 w-4 text-slate-200 -mr-1 -ml-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Template cards ──────────────────────────────────────────

interface TemplateCardProps {
  template: (typeof SITEPLAN_TEMPLATES)[number];
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-3 bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all text-left w-full min-h-[44px]"
    >
      <span className="text-2xl" role="img" aria-label={template.label}>
        {template.emoji}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{template.label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{template.description}</p>
      </div>
      <div className="mt-auto flex gap-3 text-xs text-slate-400">
        <span>{template.phaseCount} phases</span>
        <span>·</span>
        <span>{template.taskCount} tasks</span>
      </div>
    </button>
  );
}

// ─── Project name dialog ─────────────────────────────────────

interface ProjectNameDialogProps {
  open: boolean;
  defaultName: string;
  isCreating: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function ProjectNameDialog({
  open,
  defaultName,
  isCreating,
  onConfirm,
  onCancel,
}: ProjectNameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
      setTimeout(() => inputRef.current?.select(), 50);
    } else {
      el.close();
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      className="rounded-2xl shadow-2xl border-0 p-0 w-full max-w-sm backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Name your project</h2>
            <p className="text-sm text-slate-500 mt-1">
              You can rename it any time from the workspace dashboard.
            </p>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 12 Acacia Street"
            disabled={isCreating}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="off"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isCreating}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isCreating ? "Creating…" : "Create project"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

// ─── Main export ─────────────────────────────────────────────

export function SitePlanOnboardingEmptyState() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  const hierarchicalImport = useHierarchicalImport();

  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId | null>(null);
  const [projectName, setProjectName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  function openModal(templateId: TemplateId, defaultName: string) {
    setSelectedTemplateId(templateId);
    setProjectName(defaultName);
    setModalOpen(true);
  }

  function closeModal() {
    if (isCreating) return;
    setModalOpen(false);
  }

  async function handleCreate(name: string) {
    if (!companyId || !selectedTemplateId) return;

    setIsCreating(true);
    try {
      // 1. Create the workspace project
      const project = await createProject(companyId, name);

      // 2. Import template tasks (hierarchical: phases first, then children)
      const template = SITEPLAN_TEMPLATES.find((t) => t.id === selectedTemplateId)!;
      const tasks = template.buildTasks(new Date());
      await hierarchicalImport.mutateAsync({ projectId: project.id, tasks });

      // 3. Invalidate project list so it refreshes when the user navigates back
      qc.invalidateQueries({ queryKey: sitePlanKeys.projectList(companyId) });

      // 4. Navigate into the new project
      router.push(`/site-plan/${project.id}`);
    } catch (err) {
      console.error("Failed to create project from template:", err);
      toast.error("Failed to create project — please try again");
      setIsCreating(false);
    }
  }

  const selectedTemplate = SITEPLAN_TEMPLATES.find((t) => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col items-center w-full">
      <SitePlanHero />
      <OnboardingSteps />

      {/* Template picker */}
      <div className="w-full max-w-2xl mx-auto px-4 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-4">
          Start with a template
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SITEPLAN_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() =>
                openModal(
                  template.id,
                  template.id === "blank" ? "New Project" : `My ${template.label}`,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Project name dialog */}
      <ProjectNameDialog
        open={modalOpen}
        defaultName={selectedTemplate ? projectName : ""}
        isCreating={isCreating}
        onConfirm={handleCreate}
        onCancel={closeModal}
      />
    </div>
  );
}
