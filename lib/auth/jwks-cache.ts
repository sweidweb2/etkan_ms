/**
 * Process-global JWKS cache for getClaims().
 *
 * Supabase keeps JWKS per client instance / bundle, so middleware and RSC
 * each HTTP-fetch jwks.json on the first authenticated hop (~300–350ms × 2).
 * This store lives on globalThis so login, middleware, and RSC share one
 * fetch in the same Node process.
 *
 * Same class as session-shell-cache: one process, not multi-region shared.
 * Every request still verifies the JWT; this only avoids repeating JWKS HTTP.
 */

export type AuthJwks = { keys: JsonWebKey[] };

/** Match supabase-js JWKS_TTL (10 minutes). */
export const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

type JwksCacheStore = {
  jwks: AuthJwks | null;
  expiresAt: number;
  inflight: Promise<AuthJwks | null> | null;
};

declare global {
  var __etkanJwksCache: JwksCacheStore | undefined;
}

function emptyStore(): JwksCacheStore {
  return { jwks: null, expiresAt: 0, inflight: null };
}

function getStore(): JwksCacheStore {
  if (!globalThis.__etkanJwksCache) {
    globalThis.__etkanJwksCache = emptyStore();
  }
  return globalThis.__etkanJwksCache;
}

function isFresh(store: JwksCacheStore): boolean {
  return (
    store.jwks != null &&
    store.jwks.keys.length > 0 &&
    Date.now() < store.expiresAt
  );
}

async function fetchJwks(): Promise<AuthJwks | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const response = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { keys?: JsonWebKey[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    return null;
  }

  return { keys: body.keys };
}

/**
 * Cached JWKS for getClaims({ jwks }). Null when unavailable (caller falls
 * back to supabase's own fetch).
 */
export async function getCachedJwks(): Promise<AuthJwks | null> {
  const store = getStore();
  if (isFresh(store)) {
    return store.jwks;
  }

  if (store.inflight) {
    return store.inflight;
  }

  const pending = fetchJwks()
    .then((jwks) => {
      if (jwks) {
        store.jwks = jwks;
        store.expiresAt = Date.now() + JWKS_CACHE_TTL_MS;
      }
      return jwks;
    })
    .catch(() => null)
    .finally(() => {
      store.inflight = null;
    });

  store.inflight = pending;
  return pending;
}

/** Prefetch JWKS during login so the first panel hop is a HIT. */
export async function warmJwks(): Promise<void> {
  try {
    await getCachedJwks();
  } catch {
    // Login must not fail if JWKS is slow or unavailable.
  }
}

/** Test helper — clears the in-memory cache. */
export function clearCachedJwks(): void {
  globalThis.__etkanJwksCache = emptyStore();
}
