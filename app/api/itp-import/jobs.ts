// In-memory job store for import progress tracking.
// Jobs are cleaned up after 10 minutes.

export interface ImportJob {
  id: string;
  userId: string;
  step: "uploading" | "extracting" | "analyzing" | "creating" | "done" | "error" | "cancelled";
  message: string;
  percent: number;
  result?: unknown;
  error?: string;
  abortController?: AbortController;
  createdAt: number;
}

const jobs = new Map<string, ImportJob>();

export function getJob(id: string): ImportJob | undefined {
  return jobs.get(id);
}

export function setJob(job: ImportJob): void {
  jobs.set(job.id, job);
}

export function deleteJob(id: string): void {
  jobs.delete(id);
}

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);
