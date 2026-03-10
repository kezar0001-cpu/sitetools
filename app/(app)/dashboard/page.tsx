import { redirect } from "next/navigation";

export default function DashboardHome() {
  // Compatibility route: keep /dashboard working, but send users to the
  // SiteSign-first workspace flow by default.
  redirect("/dashboard/site-sign-in");
}

