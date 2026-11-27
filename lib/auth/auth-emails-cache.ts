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

export function getCachedAuthEmails(
  userIds: string[]
): Map<string, string> | null {
  if (userIds.length === 0) {
    return new Map();
  }

  const emails = new Map<string, string>();
  const now = Date.now();

  for (const id of userIds) {
    const entry = cache.get(id);
    if (!entry || now >= entry.expiresAt) {
      if (entry) {
        cache.delete(id);
      }
      return null;
    }
    emails.set(id, entry.email);
  }

  return emails;
}

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

export function setCachedAuthEmails(
  userIds: string[],
  emails: Map<string, string>,
  ttlMs = AUTH_EMAILS_TTL_MS
): void {
  if (userIds.length === 0) {
    return;
  }

  const expiresAt = Date.now() + ttlMs;
  for (const id of userIds) {
    cache.set(id, {
      email: emails.get(id) ?? "",
      expiresAt,
    });
  }
}

export function clearCachedAuthEmails(): void {
  cache.clear();
}
