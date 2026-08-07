/**
 * Short-lived process cache for middleware maintenance checks.
 * Avoids a Supabase round-trip on every navigation within the TTL window.
 */

const DEFAULT_TTL_MS = 15_000;

type CacheEntry = {
  value: boolean;
  expiresAt: number;
};

let cache: CacheEntry | null = null;

export function getCachedMaintenanceMode(): boolean | null {
  if (!cache) {
    return null;
  }
  if (Date.now() >= cache.expiresAt) {
    cache = null;
    return null;
  }
  return cache.value;
}

export function setCachedMaintenanceMode(
  value: boolean,
  ttlMs = DEFAULT_TTL_MS
): void {
  cache = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
}

/** Test helper — clears the in-memory cache. */
export function clearCachedMaintenanceMode(): void {
  cache = null;
}
