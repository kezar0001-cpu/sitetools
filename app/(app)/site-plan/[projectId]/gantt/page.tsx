import { redirect } from "next/navigation";

/**
 * The Gantt view is now embedded in the main site-plan project page.
 * Redirect any direct /gantt URL back to the parent project page.
 */
export default function GanttPage({
  params,
}: {
  params: { projectId: string };
}) {
  redirect(`/site-plan/${params.projectId}?view=gantt`);
}
