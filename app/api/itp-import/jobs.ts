// Persistent job store for import progress tracking using Upstash Redis.
// Falls back to an in-memory Map when Redis env vars are not configured.
// Jobs expire after 10 minutes (TTL managed by Redis).

import { Redis } from "@upstash/redis";

export interface ImportJob {
  id: string;
  userId: string;
  step: "uploading" | "extracting" | "analyzing" | "creating" | "done" | "error" | "cancelled";
  message: string;
  percent: number;
  result?: unknown;
  error?: string;
  createdAt: number;
}

// AbortControllers are runtime objects and cannot be serialised to Redis.
// They are kept in a process-local map. In a multi-instance deployment the
// cancel request may land on a different instance; in that case the abort
// signal won't propagate, but the job status in Redis will still be updated.
const abortControllers = new Map<string, AbortController>();

const JOB_TTL_SECONDS = 600; // 10 minutes
const KEY_PREFIX = "itp-job:";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

// Fallback in-memory store (used when Redis is not configured)
const memoryJobs = new Map<string, ImportJob>();

// Clean up in-memory fallback jobs every 5 minutes
setInterval(() => {
  const now = Date.now();
  memoryJobs.forEach((job, id) => {
    if (now - job.createdAt > JOB_TTL_SECONDS * 1000) {
      memoryJobs.delete(id);
    }
  });
}, 5 * 60 * 1000);

export async function getJob(
  id: string
): Promise<(ImportJob & { abortController?: AbortController }) | undefined> {
  const redis = getRedis();
  if (redis) {
    try {
      const job = await redis.get<ImportJob>(`${KEY_PREFIX}${id}`);
      if (!job) return undefined;
      return { ...job, abortController: abortControllers.get(id) };
    } catch {
      // fall through to in-memory
    }
  }
  const job = memoryJobs.get(id);
  if (!job) return undefined;
  return { ...job, abortController: abortControllers.get(id) };
}

export async function setJob(
  job: ImportJob & { abortController?: AbortController }
): Promise<void> {
  const { abortController, ...jobData } = job;
  if (abortController) {
    abortControllers.set(job.id, abortController);
  }

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`${KEY_PREFIX}${job.id}`, jobData, {
        ex: JOB_TTL_SECONDS,
      });
      return;
    } catch {
      // fall through to in-memory
    }
  }
  memoryJobs.set(job.id, jobData);
}

export async function deleteJob(id: string): Promise<void> {
  abortControllers.delete(id);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`${KEY_PREFIX}${id}`);
      return;
    } catch {
      // fall through to in-memory
    }
  }
  memoryJobs.delete(id);
}
