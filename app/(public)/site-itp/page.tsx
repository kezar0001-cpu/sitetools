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
    icon: <span className="text-lg">✅</span>,
    title: "Digital ITP workflows",
    description: "Run inspections with structured digital checklists instead of paper forms.",
  },
  {
    icon: <span className="text-lg">🛑</span>,
    title: "Hold point controls",
    description: "Prevent progression until required hold point approvals are completed.",
  },
  {
    icon: <span className="text-lg">👁️</span>,
    title: "Witness point tracking",
    description: "Capture witness events and sign-offs with a full time-stamped trail.",
  },
  {
    icon: <span className="text-lg">👷</span>,
    title: "Role-based approvals",
    description: "Route sign-off to inspectors, engineers, and principals with clear ownership.",
  },
  {
    icon: <span className="text-lg">📊</span>,
    title: "Live QA status",
    description: "Monitor what is pending, in progress, and complete across every work front.",
  },
  {
    icon: <span className="text-lg">📁</span>,
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
      moduleName="Buildstate Site ITP"
      hero={{
        badge: "Buildstate Site ITP",
        title: (
          <>
            QA sign-offs controlled in real time, <span className="text-white/90">from field to office.</span>
          </>
        ),
        description:
          "Digitise inspection and test plans, enforce hold points, and close out QA work with cleaner evidence and faster approvals.",
        primaryCta: { href: "/login?signup=1&intent=siteitp", label: "Start Site ITP free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Structured QA · Fewer bottlenecks · Handover-ready outputs",
      }}
      demoPanel={{
        title: "Issue, inspect, sign-off.",
        description: "See ITP items move from pending to complete with hold point control built in.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live Site ITP demo",
        panelContent: <SiteITPDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "Everything needed for practical QA control.",
        items: features,
      }}
      comparison={{
        eyebrow: "Site ITP vs. paper QA",
        title: "Better oversight, cleaner close-out.",
        baselineLabel: "Legacy QA",
        moduleLabel: "Site ITP",
        rows: comparison,
      }}
      finalCta={{
        title: "Run your next ITP workflow digitally.",
        description: "Start free and track QA progress in real time from day one.",
        primaryCta: { href: "/login?signup=1&intent=siteitp", label: "Start Site ITP free" },
      }}
    />
  );
}
