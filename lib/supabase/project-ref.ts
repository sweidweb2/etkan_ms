export function getSupabaseProjectRef(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
): string | null {
  if (!supabaseUrl) {
    return null;
  }

  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
