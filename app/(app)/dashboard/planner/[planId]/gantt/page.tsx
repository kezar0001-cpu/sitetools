import { PlanWorkspaceClient } from "../../components/PlanWorkspaceClient";

export default function PlannerGanttPage({ params }: { params: { planId: string } }) {
    return <PlanWorkspaceClient planId={params.planId} mode="gantt" />;
}
