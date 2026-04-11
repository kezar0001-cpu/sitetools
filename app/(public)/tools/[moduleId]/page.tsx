import { redirect } from "next/navigation";
import { MODULES } from "@/lib/modules";

// Map old module IDs to their dedicated public marketing pages.
const MODULE_REDIRECT: Record<string, string> = {
  "site-sign-in": "/sitesign",
  planner:        "/siteplan",
  "site-capture": "/site-capture",
  "itp-builder":  "/site-itp",
  "site-docs":    "/site-docs",
};

export function generateStaticParams() {
  return MODULES.map((module) => ({ moduleId: module.id }));
}

export default function ToolDetailPage({ params }: { params: { moduleId: string } }) {
  const destination = MODULE_REDIRECT[params.moduleId] ?? "/";
  redirect(destination);
}
