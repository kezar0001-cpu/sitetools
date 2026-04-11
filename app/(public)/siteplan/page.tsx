import type { Metadata } from "next";
import SitePlanDemo from "@/components/animations/SitePlanDemo";
import ModulePageTemplate from "@/components/modules/ModulePageTemplate";

export const metadata: Metadata = {
  title: "SitePlan — Civil Programme Planning & Delivery Tracking | Buildstate",
  description:
    "Build your civil programme, track daily delivery progress, manage delays, and keep field and office teams aligned. Purpose-built for civil construction project managers.",
};

const steps = [
  {
    title: "Build your programme",
    description:
      "Create project stages, milestones, and tasks. Set planned start and end dates and link them to your site.",
  },
  {
    title: "Track daily delivery",
    description:
      "Update actual progress daily. Delay flags appear automatically when work falls behind planned dates.",
  },
  {
    title: "Coordinate your team",
    description:
      "One shared planning view for engineers, supervisors, and PMs. Everyone sees the same up-to-date programme.",
  },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Programme builder",
    description: "Create structured delivery programmes with stages, tasks, and milestones. Import or build from scratch.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    title: "Progress tracking",
    description: "Mark daily delivery progress against planned dates. See instantly what's on track, ahead, or behind.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    title: "Delay flags",
    description: "Automatic delay detection highlights items that have slipped. Log reasons and corrective actions directly.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    title: "Gantt view",
    description: "Visualise your programme as a Gantt chart. Drag to adjust dates, see dependencies, and track critical path.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Team collaboration",
    description: "Shared workspace for field and office. Every update is visible to the whole project team immediately.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Reporting",
    description: "Generate programme reports for your principal contractor or client. Export progress summaries quickly.",
  },
];

const comparison = [
  { item: "Programme updates", baseline: "Spreadsheet and email chain", module: "Shared live programme board" },
  { item: "Delay detection", baseline: "Often found late", module: "Auto flags with context" },
  { item: "Site-to-office visibility", baseline: "Manual status calls", module: "Single real-time source" },
  { item: "Change communication", baseline: "Version confusion", module: "Timeline updates everyone sees" },
  { item: "Client reporting", baseline: "Manual summary prep", module: "Export-ready delivery snapshots" },
];

export default function SitePlanPage() {
  return (
    <ModulePageTemplate
      moduleName="Buildstate SitePlan"
      hero={{
        badge: "Buildstate SitePlan",
        title: (
          <>
            Civil programme planning, <span className="text-white/90">built for the field.</span>
          </>
        ),
        description:
          "Build your delivery programme, track daily progress, and keep field and office teams aligned — in one shared workspace designed for civil construction.",
        primaryCta: { href: "/login?signup=1&intent=siteplan", label: "Start SitePlan free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Free to start · No credit card · Cancel anytime",
      }}
      demoPanel={{
        title: "From programme to delivery — in one view.",
        description: "Plan the work, update daily delivery, and catch delay risk before it impacts handover.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live SitePlan demo",
        panelContent: <SitePlanDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "Everything you need to run a live programme.",
        items: features,
      }}
      comparison={{
        eyebrow: "SitePlan vs. spreadsheets",
        title: "Why teams switch to live programme controls.",
        baselineLabel: "Legacy planning",
        moduleLabel: "SitePlan",
        rows: comparison,
      }}
      finalCta={{
        title: "Start SitePlan with your next programme.",
        description: "No spreadsheets, no disconnected systems, no guesswork.",
        primaryCta: { href: "/login?signup=1&intent=siteplan", label: "Start SitePlan free" },
      }}
    />
  );
}
