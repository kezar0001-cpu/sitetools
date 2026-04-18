import type { Metadata } from "next";
import SiteCaptureDemo from "@/components/animations/SiteCaptureDemo";
import ModulePageTemplate from "@/components/modules/ModulePageTemplate";
import { resolveMediaSlot } from "@/lib/cms/publicMedia";

export const metadata: Metadata = {
  title: "SiteCapture — Daily Site Records & Export Automation | Buildstate",
  description:
    "SiteCapture helps teams record site diaries, progress notes, weather, labour, and delivery updates in one place with instant export-ready records.",
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
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Mobile-first daily diary",
    description: "Capture complete diary entries from site with a fast, structured input flow.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: "Weather & conditions log",
    description: "Store daily weather details with each entry to support delay and productivity context.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Labour and plant tracking",
    description: "Track headcount and equipment use per day with consistent project-level records.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    ),
    title: "Evidence-ready notes",
    description: "Keep issue notes and completed work details in a standard format for handover confidence.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: "Instant exports",
    description: "Publish PDF, CSV, and Excel outputs immediately without reformatting in spreadsheets.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
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

export default async function SiteCapturePage() {
  const heroImage = await resolveMediaSlot("siteCaptureWorkflow");

  // Structured data for SoftwareApplication with features
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SiteCapture",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "AUD",
    },
    "featureList": features.map(f => f.title).join(", "),
    "description": "Digital daily site diary and records for construction teams.",
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ModulePageTemplate
      moduleName="Buildstate SiteCapture"
      theme="sky"
      hero={{
        badge: "Buildstate SiteCapture",
        title: (
          <>
            Daily records captured once,{" "}
            <span className="opacity-80">ready everywhere.</span>
          </>
        ),
        description:
          "Replace fragmented notebooks and end-of-day rework with structured, mobile-first daily site records your whole project can trust.",
        primaryCta: { href: "/login?signup=1&intent=sitecapture", label: "Start SiteCapture free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Fast setup · Built for site teams · Export-ready from day one",
        heroImage: { src: heroImage.src, alt: heroImage.alt },
      }}
      demoPanel={{
        eyebrow: "See it in action",
        title: "Capture, structure, export.",
        description: "Turn daily site activity into clear outputs without duplicate admin.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live SiteCapture demo",
        panelContent: <SiteCaptureDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "Built for real daily site reporting.",
        items: features,
      }}
      comparison={{
        eyebrow: "SiteCapture vs. manual diaries",
        title: "More consistency, less end-of-day admin.",
        baselineLabel: "Manual workflow",
        moduleLabel: "SiteCapture",
        rows: comparison,
      }}
      finalCta={{
        title: "Move your daily site records to one system.",
        description: "Start free and ship your first export-ready diary today.",
        primaryCta: { href: "/login?signup=1&intent=sitecapture", label: "Start SiteCapture free" },
        secondaryCta: { href: "/login", label: "Log in" },
      }}
    />
    </>
  );
}
