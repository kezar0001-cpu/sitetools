import { PlanWorkspaceClient } from "../../components/PlanWorkspaceClient";

export default function PlannerTimelinePage({ params }: { params: { planId: string } }) {
  return <PlanWorkspaceClient planId={params.planId} mode="timeline" />;
}
