type CookieLike = {
  name: string;
};

/** True when request carries Supabase auth session cookies (valid or stale). */
export function hasSupabaseAuthCookies(cookies: CookieLike[]): boolean {
  return cookies.some((cookie) => cookie.name.includes("-auth-token"));
}
