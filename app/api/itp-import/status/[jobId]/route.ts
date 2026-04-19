import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getJob, deleteJob } from "../../jobs";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { jobId } = await params;

  // Authenticate
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // Only allow the job owner to check status
  if (job.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const response: Record<string, unknown> = {
    step: job.step,
    message: job.message,
    percent: job.percent,
  };

  if (job.step === "done") {
    response.result = job.result;
  }

  if (job.step === "error") {
    response.error = job.error;
  }

  return NextResponse.json(response);
}

// DELETE to cancel a job
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  if (job.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Abort the in-flight request (only works if cancel hits the same instance)
  if (job.abortController) {
    job.abortController.abort();
  }
  await deleteJob(jobId);

  return NextResponse.json({ cancelled: true });
}
