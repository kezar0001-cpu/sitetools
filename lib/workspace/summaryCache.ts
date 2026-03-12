import { WorkspaceSummary } from "@/lib/workspace/types";

const SUMMARY_TTL_MS = 30_000;

type CachedWorkspaceSummary = {
  summary: WorkspaceSummary;
  cachedAt: number;
};

let memoryCache: CachedWorkspaceSummary | null = null;

function isFresh(cache: CachedWorkspaceSummary | null): cache is CachedWorkspaceSummary {
  if (!cache) return false;
  return Date.now() - cache.cachedAt < SUMMARY_TTL_MS;
}

export function getCachedWorkspaceSummary(): WorkspaceSummary | null {
  if (!isFresh(memoryCache)) {
    memoryCache = null;
    return null;
  }

  return memoryCache.summary;
}

export function cacheWorkspaceSummary(summary: WorkspaceSummary): void {
  memoryCache = {
    summary,
    cachedAt: Date.now(),
  };
}

export function clearWorkspaceSummaryCache(): void {
  memoryCache = null;
}
