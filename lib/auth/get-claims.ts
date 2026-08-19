import { getCachedJwks } from "@/lib/auth/jwks-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * getClaims() with process-shared JWKS so middleware and RSC do not each
 * HTTP-fetch jwks.json. Falls back to supabase's fetch when the cache is empty.
 */
export async function getClaimsWithSharedJwks(client: SupabaseClient) {
  const jwks = await getCachedJwks();
  if (jwks && jwks.keys.length > 0) {
    return client.auth.getClaims(undefined, {
      jwks: { keys: jwks.keys as never },
    });
  }
  return client.auth.getClaims();
}
