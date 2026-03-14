"use client";

import { PlanWorkspaceClient } from "../components/PlanWorkspaceClient";

export default function PlannerPlanPage({ params }: { params: { planId: string } }) {
  return <PlanWorkspaceClient planId={params.planId} mode="sheet" />;
}
