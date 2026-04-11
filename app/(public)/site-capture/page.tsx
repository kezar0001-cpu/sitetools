import type { Metadata } from "next";
import SiteCaptureDemo from "@/components/animations/SiteCaptureDemo";
import ModulePageTemplate from "@/components/modules/ModulePageTemplate";

export const metadata: Metadata = {
  title: "Site Capture — Daily Site Records & Export Automation | Buildstate",
  description:
    "Capture site diaries, progress notes, weather, labour, and delivery updates in one place. Export polished daily records instantly for PM, client, and compliance workflows.",
};

const steps = [
  {
    title: "Capture field updates fast",
    description: "Record weather, crews, plant, completed works, and delays on mobile in minutes.",
  },
  {
    title: "Keep records structured",
    description: "Use consistent daily templates so project teams and auditors can find what they need.",
  },
  {
    title: "Export in one click",
    description: "Generate PDF, Excel, or CSV outputs ready for sharing with clients and internal teams.",
  },
];

const features = [
  {
    icon: <span className="text-lg">📝</span>,
    title: "Mobile-first daily diary",
    description: "Capture complete diary entries from site with a fast, structured input flow.",
  },
  {
    icon: <span className="text-lg">🌦️</span>,
    title: "Weather & conditions log",
    description: "Store daily weather details with each entry to support delay and productivity context.",
  },
  {
    icon: <span className="text-lg">👷</span>,
    title: "Labour and plant tracking",
    description: "Track headcount and equipment use per day with consistent project-level records.",
  },
  {
    icon: <span className="text-lg">📎</span>,
    title: "Evidence-ready notes",
    description: "Keep issue notes and completed work details in a standard format for handover confidence.",
  },
  {
    icon: <span className="text-lg">📤</span>,
    title: "Instant exports",
    description: "Publish PDF, CSV, and Excel outputs immediately without reformatting in spreadsheets.",
  },
  {
    icon: <span className="text-lg">🗂️</span>,
    title: "Central daily archive",
    description: "Every day is searchable and traceable, making disputes and audits easier to resolve.",
  },
];

const comparison = [
  { item: "Diary completion", baseline: "Late-day paperwork", module: "Live entries from site" },
  { item: "Record consistency", baseline: "Variable notebook quality", module: "Template-led standard logs" },
  { item: "Distribution", baseline: "Manual email attachments", module: "One-click export and share" },
  { item: "Audit readiness", baseline: "Scattered files", module: "Central searchable record" },
  { item: "Admin time", baseline: "High after-hours data cleanup", module: "Reduced by structured capture" },
];

export default function SiteCapturePage() {
  return (
    <ModulePageTemplate
      moduleName="Buildstate Site Capture"
      hero={{
        badge: "Buildstate Site Capture",
        title: (
          <>
            Daily records captured once, <span className="text-white/90">ready everywhere.</span>
          </>
        ),
        description:
          "Replace fragmented notebooks and end-of-day rework with structured, mobile-first daily site records your whole project can trust.",
        primaryCta: { href: "/login?signup=1&intent=sitecapture", label: "Start Site Capture free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Fast setup · Built for site teams · Export-ready from day one",
      }}
      demoPanel={{
        title: "Capture, structure, export.",
        description: "Turn daily site activity into clear outputs without duplicate admin.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live Site Capture demo",
        panelContent: <SiteCaptureDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "Built for real daily site reporting.",
        items: features,
      }}
      comparison={{
        eyebrow: "Site Capture vs. manual diaries",
        title: "More consistency, less end-of-day admin.",
        baselineLabel: "Manual workflow",
        moduleLabel: "Site Capture",
        rows: comparison,
      }}
      finalCta={{
        title: "Move your daily site records to one system.",
        description: "Start free and ship your first export-ready diary today.",
        primaryCta: { href: "/login?signup=1&intent=sitecapture", label: "Start Site Capture free" },
      }}
    />
  );
}
