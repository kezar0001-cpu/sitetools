import type { Metadata } from "next";
import SiteSignDemo from "@/components/animations/SiteSignDemo";
import ModulePageTemplate from "@/components/modules/ModulePageTemplate";

export const metadata: Metadata = {
  title: "SiteSign — Digital Site Sign-In for Construction | Buildstate",
  description:
    "Replace paper sign-in sheets with QR-based digital gate sign-in. Workers scan with their phone, you get live headcount and export-ready compliance records.",
};

const steps = [
  {
    title: "Set up your site QR code",
    description:
      "Create a site sign-in point and print a single QR poster for the gate. Takes about 5 minutes.",
  },
  {
    title: "Workers scan and sign in",
    description:
      "Every worker checks in from their phone camera in seconds. No apps to download, no accounts needed.",
  },
  {
    title: "Track attendance and export",
    description:
      "Live headcount from your dashboard. Export a signed register as CSV, Excel, or PDF in one click.",
  },
];

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4.5 4.5l15 15" />
      </svg>
    ),
    title: "QR gate sign-in",
    description: "One poster at the gate. Workers scan with their phone camera — no app install. Works on every phone.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Live headcount",
    description: "See exactly who is on site right now from your dashboard. Track workers, subcontractors, visitors, and deliveries.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    title: "Digital signatures",
    description: "Capture a digital signature from every worker on sign-in. Touch-friendly, works on any mobile.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Compliance exports",
    description: "Download signed attendance registers as CSV, Excel, or PDF — instantly formatted for site audits.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Time & date stamped",
    description: "Every sign-in and sign-out is timestamped. Workers can correct their arrival time with an audit reason.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16l-4 4m0 0h4m-4 0v-4m16-8V4m0 0h-4m4 0l-4 4M9 12a3 3 0 116 0v4a3 3 0 11-6 0v-4z" />
      </svg>
    ),
    title: "Offline-ready sign-in",
    description: "Keep crews moving in low-connectivity areas, then sync attendance records once signal returns.",
  },
];

const comparison = [
  { item: "Worker sign-in time", baseline: "60–90 sec at the gate", module: "< 10 seconds by phone" },
  { item: "Live headcount", baseline: "Manual count required", module: "Instant, from your phone" },
  { item: "Compliance record", baseline: "Physical clipboard, filed manually", module: "Automatic, digital, downloadable" },
  { item: "Signature capture", baseline: "Pen on paper", module: "Digital, stored forever" },
  { item: "Audit preparation", baseline: "Hours of data entry", module: "One-click export" },
];

export default function SiteSignPage() {
  return (
    <ModulePageTemplate
      moduleName="Buildstate SiteSign"
      hero={{
        badge: "Buildstate SiteSign",
        title: (
          <>
            Gate sign-in. <span className="text-white/90">No more paper.</span>
          </>
        ),
        description:
          "Replace your paper logbooks with a phone-based QR sign-in system. Workers are at the gate in seconds. You see live headcount and have audit-ready records — instantly.",
        primaryCta: { href: "/login?signup=1&intent=sitesign", label: "Start SiteSign free" },
        secondaryCta: { href: "/login", label: "Log in" },
        helperText: "Free tier available · No credit card · Set up in under 10 min",
      }}
      demoPanel={{
        title: "From setup to live in minutes.",
        description: "See how fast teams can move from gate QR setup to compliant digital attendance.",
        bullets: steps.map((step, index) => `${index + 1}. ${step.title}`),
        panelTitle: "Live SiteSign demo",
        panelContent: <SiteSignDemo />,
      }}
      features={{
        eyebrow: "Features",
        title: "Everything a site supervisor needs.",
        items: features,
      }}
      comparison={{
        eyebrow: "SiteSign vs. paper",
        title: "Why switch from clipboards?",
        baselineLabel: "Paper / Clipboard",
        moduleLabel: "SiteSign",
        rows: comparison,
      }}
      finalCta={{
        title: "Start using SiteSign on your next project.",
        description: "No credit card required. Set up your first site in under 10 minutes.",
        primaryCta: { href: "/login?signup=1&intent=sitesign", label: "Start SiteSign free" },
      }}
    />
  );
}
