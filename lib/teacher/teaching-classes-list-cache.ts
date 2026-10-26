/**
 * Short-lived process cache for a teacher's class list.
 * Dedupes list page RSC + navbar search action within the TTL.
 */

const TEACHING_CLASSES_TTL_MS = 30_000;

type CacheEntry<T> = {
  rows: T[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function getCachedTeachingClassesList<T>(
  actorUserId: string
): T[] | null {
  const entry = cache.get(actorUserId) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    cache.delete(actorUserId);
    return null;
  }
  return entry.rows;
}

export function setCachedTeachingClassesList<T>(
  actorUserId: string,
  rows: T[],
  ttlMs = TEACHING_CLASSES_TTL_MS
): void {
  cache.set(actorUserId, {
    rows,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateTeachingClassesListCache(actorUserId?: string): void {
  if (actorUserId) {
    cache.delete(actorUserId);
    return;
  }
  cache.clear();
}
