"use client";

import { PlanWorkspacePrintClient } from "../../components/PlanWorkspacePrintClient";

export default function PlannerPrintPage({ params }: { params: { planId: string } }) {
    return <PlanWorkspacePrintClient planId={params.planId} />;
}
