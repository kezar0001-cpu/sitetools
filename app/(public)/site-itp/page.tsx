import type { Metadata } from "next";
import SiteITPDemo from "@/components/animations/SiteITPDemo";
import ModulePageTemplate from "@/components/modules/ModulePageTemplate";

export const metadata: Metadata = {
  title: "SiteITP — Digital ITP Checklists, Hold Points & Sign-Offs | Buildstate",
  description:
    "SiteITP manages inspection and test plans with digital checklists, hold points, witness points, and audit-ready sign-offs from field to office.",
};

const steps = [
  {
    title: "Assign ITP checklists",
    description: "Issue project-specific ITP items to the right roles before works begin.",
  },
  {
    title: "Capture hold/witness sign-offs",
    description: "Record digital approvals at required points with time-stamped accountability.",
  },
  {
    title: "Close QA with confidence",
    description: "Track completion status live and produce clear QA evidence packs for handover.",
  },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "Digital ITP workflows",
    description: "Run inspections with structured digital checklists instead of paper forms.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    title: "Hold point controls",
    description: "Prevent progression until required hold point approvals are completed.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: "Witness point tracking",
    description: "Capture witness events and sign-offs with a full time-stamped trail.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Role-based approvals",
    description: "Route sign-off to inspectors, engineers, and principals with clear ownership.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Live QA status",
    description: "Monitor what is pending, in progress, and complete across every work front.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Audit-ready evidence",
    description: "Generate handover-friendly QA records without rebuilding paperwork later.",
  },
];

const comparison = [
  { item: "Checklist control", baseline: "Paper sheets", module: "Digital task-based workflow" },
  { item: "Hold points", baseline: "Phone/email coordination", module: "System-enforced approvals" },
  { item: "Visibility", baseline: "Unclear outstanding items", module: "Live completion view" },
  { item: "Sign-off quality", baseline: "Inconsistent records", module: "Time-stamped role approvals" },
  { item: "Handover prep", baseline: "Manual QA pack assembly", module: "Export-ready QA evidence" },
];

export default function SiteItpPage() {
  return (
    <ModulePageTemplate
      moduleName="Buildstate SiteITP"
      theme="violet"
      hero={{
        badge: "Buildstate SiteITP",
        title: (
          <>
            QA sign-offs controlled in real time,{" "}
            <span className="opacity-80">from field to office.</span>
          </>
        ),
        description:
          "Digitise inspection and test plans, enforce hold points, and close out QA work with cleaner evidence and faster approvals.",
        primaryCta: { href: "/login?signup=1&intent=siteitp", label: "Start SiteITP free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Structured QA · Fewer bottlenecks · Handover-ready outputs",
      }}
      demoPanel={{
        eyebrow: "See it in action",
        title: "Issue, inspect, sign-off.",
        description: "See ITP items move from pending to complete with hold point control built in.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live SiteITP demo",
        panelContent: <SiteITPDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "Everything needed for practical QA control.",
        items: features,
      }}
      comparison={{
        eyebrow: "SiteITP vs. paper QA",
        title: "Better oversight, cleaner close-out.",
        baselineLabel: "Legacy QA",
        moduleLabel: "SiteITP",
        rows: comparison,
      }}
      finalCta={{
        title: "Run your next ITP workflow digitally.",
        description: "Start free and track QA progress in real time from day one.",
        primaryCta: { href: "/login?signup=1&intent=siteitp", label: "Start SiteITP free" },
        secondaryCta: { href: "/login", label: "Log in" },
      }}
    />
  );
}
