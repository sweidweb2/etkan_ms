/**
 * Short-lived process cache for Auth Admin email maps.
 * Keyed by sorted user ids so shared callers (users / instructors / students)
 * can reuse a warm map within the TTL without a schema migration.
 */

const AUTH_EMAILS_TTL_MS = 60_000;

type CacheEntry = {
  emails: Map<string, string>;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(userIds: string[]): string {
  return [...userIds].sort().join(",");
}

export function getCachedAuthEmails(
  userIds: string[]
): Map<string, string> | null {
  if (userIds.length === 0) {
    return new Map();
  }
  const key = cacheKey(userIds);
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return new Map(entry.emails);
}

export function setCachedAuthEmails(
  userIds: string[],
  emails: Map<string, string>,
  ttlMs = AUTH_EMAILS_TTL_MS
): void {
  if (userIds.length === 0) {
    return;
  }
  cache.set(cacheKey(userIds), {
    emails: new Map(emails),
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearCachedAuthEmails(): void {
  cache.clear();
}
