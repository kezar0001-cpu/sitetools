import { WorkspaceSummary } from "@/lib/workspace/types";

const SUMMARY_TTL_MS = 30_000;

type CachedWorkspaceSummary = {
  summary: WorkspaceSummary;
  cachedAt: number;
};

const memoryCache = new Map<string, CachedWorkspaceSummary>();

function isFresh(cache: CachedWorkspaceSummary | null): cache is CachedWorkspaceSummary {
  if (!cache) return false;
  return Date.now() - cache.cachedAt < SUMMARY_TTL_MS;
}

export function getCachedWorkspaceSummary(userId: string, companyId: string): WorkspaceSummary | null {
  const key = `${userId}:${companyId}`;
  const cache = memoryCache.get(key) ?? null;
  if (!isFresh(cache)) {
    memoryCache.delete(key);
    return null;
  }

  return cache.summary;
}

export function cacheWorkspaceSummary(summary: WorkspaceSummary): void {
  const companyId = summary.activeMembership?.company_id ?? "";
  const key = `${summary.userId}:${companyId}`;
  memoryCache.set(key, {
    summary,
    cachedAt: Date.now(),
  });
}

export function getAnyCachedWorkspaceSummary(userId: string): WorkspaceSummary | null {
  const prefix = `${userId}:`;
  for (const [key, entry] of Array.from(memoryCache.entries())) {
    if (key.startsWith(prefix) && isFresh(entry)) {
      return entry.summary;
    }
  }
  return null;
}

export function clearWorkspaceSummaryCache(userId?: string, companyId?: string): void {
  if (userId !== undefined && companyId !== undefined) {
    memoryCache.delete(`${userId}:${companyId}`);
  } else {
    memoryCache.clear();
  }
}
