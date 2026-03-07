import { redirect } from "next/navigation";

export default function PlannerTimelinePage({ params }: { params: { planId: string } }) {
  redirect(`/dashboard/planner/${params.planId}/gantt`);
}
