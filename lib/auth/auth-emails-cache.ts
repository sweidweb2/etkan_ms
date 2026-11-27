/**
 * Short-lived process cache for Auth Admin emails, keyed per user id.
 * Overlapping roster/list calls reuse warm entries and only fetch misses.
 */

const AUTH_EMAILS_TTL_MS = 60_000;

type CacheEntry = {
  email: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/** Returns only the ids that are missing or expired in the per-id cache. */
export function getMissingAuthEmailIds(userIds: string[]): string[] {
  const now = Date.now();
  const missing: string[] = [];

  for (const id of userIds) {
    const entry = cache.get(id);
    if (!entry || now >= entry.expiresAt) {
      if (entry) {
        cache.delete(id);
      }
      missing.push(id);
    }
  }

  return missing;
}

export function collectCachedAuthEmails(
  userIds: string[]
): Map<string, string> {
  const emails = new Map<string, string>();
  const now = Date.now();

  for (const id of userIds) {
    const entry = cache.get(id);
    if (!entry || now >= entry.expiresAt) {
      if (entry) {
        cache.delete(id);
      }
      continue;
    }
    emails.set(id, entry.email);
  }

  return emails;
}

/**
 * Cache resolved emails. Only ids present in `emails` are written — callers
 * must omit failed lookups so they are retried on the next request.
 */
export function setCachedAuthEmails(
  userIds: string[],
  emails: Map<string, string>,
  ttlMs = AUTH_EMAILS_TTL_MS
): void {
  if (userIds.length === 0 || emails.size === 0) {
    return;
  }

  const expiresAt = Date.now() + ttlMs;
  for (const id of userIds) {
    if (!emails.has(id)) {
      continue;
    }
    cache.set(id, {
      email: emails.get(id) ?? "",
      expiresAt,
    });
  }
}

/** Short negative cache so soft-fail misses do not stampede Auth Admin. */
export const AUTH_EMAIL_MISS_TTL_MS = 15_000;

export function setCachedAuthEmailMisses(
  userIds: readonly string[],
  ttlMs = AUTH_EMAIL_MISS_TTL_MS
): void {
  if (userIds.length === 0) {
    return;
  }

  const expiresAt = Date.now() + ttlMs;
  for (const id of userIds) {
    cache.set(id, { email: "", expiresAt });
  }
}

export function clearCachedAuthEmails(): void {
  cache.clear();
}
