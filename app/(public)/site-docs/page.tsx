import type { Metadata } from "next";
import SiteDocsDemo from "@/components/animations/SiteDocsDemo";
import ModulePageTemplate from "@/components/modules/ModulePageTemplate";

export const metadata: Metadata = {
  title: "SiteDocs — Controlled Construction Document Workflow | Buildstate",
  description:
    "SiteDocs manages construction documents from draft to approval with revision control, digital reviews, and issue tracking for aligned project teams.",
};

const steps = [
  {
    title: "Create and organise documents",
    description: "Store templates, revisions, and project docs in one controlled structure.",
  },
  {
    title: "Review and approve digitally",
    description: "Move docs through review workflows with clear status and responsible sign-off roles.",
  },
  {
    title: "Issue the right revision",
    description: "Share approved versions quickly while maintaining a complete audit trail.",
  },
];

const features = [
  {
    icon: <span className="text-lg">📄</span>,
    title: "Central document register",
    description: "Keep project documentation in one controlled register instead of scattered folders.",
  },
  {
    icon: <span className="text-lg">🔁</span>,
    title: "Revision control",
    description: "Track versions clearly so teams always know the latest approved issue.",
  },
  {
    icon: <span className="text-lg">✍️</span>,
    title: "Digital sign-off",
    description: "Capture review and approval actions with accountability and timestamps.",
  },
  {
    icon: <span className="text-lg">🏷️</span>,
    title: "Status visibility",
    description: "See draft, in review, and approved states at a glance across every document.",
  },
  {
    icon: <span className="text-lg">📦</span>,
    title: "Issue-ready packs",
    description: "Generate clean document outputs for subcontractors, clients, and handover.",
  },
  {
    icon: <span className="text-lg">🔍</span>,
    title: "Traceable history",
    description: "Maintain a full activity trail for audits, disputes, and compliance checks.",
  },
];

const comparison = [
  { item: "Version certainty", baseline: "Conflicting files", module: "Single current revision" },
  { item: "Review workflow", baseline: "Email threads", module: "Structured status flow" },
  { item: "Approvals", baseline: "Hard to verify", module: "Recorded digital sign-offs" },
  { item: "Issue process", baseline: "Manual file assembly", module: "Issue-ready document packs" },
  { item: "Audit trace", baseline: "Partial history", module: "Complete change timeline" },
];

export default function SiteDocsPage() {
  return (
    <ModulePageTemplate
      moduleName="Buildstate Site Docs"
      hero={{
        badge: "Buildstate Site Docs",
        title: (
          <>
            Construction documents controlled end to end, <span className="text-white/90">without version chaos.</span>
          </>
        ),
        description:
          "Standardise document workflows from draft through approval so teams always work from the right revision with clear accountability.",
        primaryCta: { href: "/login?signup=1&intent=sitedocs", label: "Start Site Docs free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Central register · Clear approvals · Audit-friendly history",
      }}
      demoPanel={{
        title: "Draft to approved in one workflow.",
        description: "Keep document status visible and issue trusted revisions faster.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live Site Docs demo",
        panelContent: <SiteDocsDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "A practical document system for project teams.",
        items: features,
      }}
      comparison={{
        eyebrow: "Site Docs vs. folder/email workflows",
        title: "Less confusion, stronger control.",
        baselineLabel: "Manual document flow",
        moduleLabel: "Site Docs",
        rows: comparison,
      }}
      finalCta={{
        title: "Bring document control into one system.",
        description: "Start free and move your next approval workflow online.",
        primaryCta: { href: "/login?signup=1&intent=sitedocs", label: "Start Site Docs free" },
      }}
    />
  );
}
