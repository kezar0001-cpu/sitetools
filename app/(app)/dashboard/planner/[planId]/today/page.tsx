"use client";

import { PlanWorkspaceClient } from "../../components/PlanWorkspaceClient";

export default function PlannerTodayPage({ params }: { params: { planId: string } }) {
  return <PlanWorkspaceClient planId={params.planId} mode="today" />;
}
