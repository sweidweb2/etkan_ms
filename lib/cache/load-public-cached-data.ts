/**
 * Public ISR loaders must not fail `next build` when Supabase is
 * unreachable (CI dummy env, outage). Marketing pages show empty instead.
 */
export async function loadPublicCachedData<T>(
  fallback: T,
  load: () => Promise<T>
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[public-cache] falling back after load failure", error);
    return fallback;
  }
}
