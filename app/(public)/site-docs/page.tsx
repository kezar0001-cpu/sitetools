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
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Central document register",
    description: "Keep project documentation in one controlled register instead of scattered folders.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Revision control",
    description: "Track versions clearly so teams always know the latest approved issue.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    title: "Digital sign-off",
    description: "Capture review and approval actions with accountability and timestamps.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    title: "Status visibility",
    description: "See draft, in review, and approved states at a glance across every document.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: "Issue-ready packs",
    description: "Generate clean document outputs for subcontractors, clients, and handover.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
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
      moduleName="Buildstate SiteDocs"
      theme="cyan"
      hero={{
        badge: "Buildstate SiteDocs",
        title: (
          <>
            Construction documents controlled end to end,{" "}
            <span className="opacity-80">without version chaos.</span>
          </>
        ),
        description:
          "Standardise document workflows from draft through approval so teams always work from the right revision with clear accountability.",
        primaryCta: { href: "/login?signup=1&intent=sitedocs", label: "Start SiteDocs free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Central register · Clear approvals · Audit-friendly history",
      }}
      demoPanel={{
        eyebrow: "See it in action",
        title: "Draft to approved in one workflow.",
        description: "Keep document status visible and issue trusted revisions faster.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live SiteDocs demo",
        panelContent: <SiteDocsDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "A practical document system for project teams.",
        items: features,
      }}
      comparison={{
        eyebrow: "SiteDocs vs. folder/email workflows",
        title: "Less confusion, stronger control.",
        baselineLabel: "Manual document flow",
        moduleLabel: "SiteDocs",
        rows: comparison,
      }}
      finalCta={{
        title: "Bring document control into one system.",
        description: "Start free and move your next approval workflow online.",
        primaryCta: { href: "/login?signup=1&intent=sitedocs", label: "Start SiteDocs free" },
        secondaryCta: { href: "/login", label: "Log in" },
      }}
    />
  );
}
