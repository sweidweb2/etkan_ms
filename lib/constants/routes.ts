export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  /** Supabase redirect target — see docs/config/supabase-auth.md */
  CALLBACK: "/auth/callback",
  ADMIN_ROOT: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

export function getDashboardRouteForRole(
  role: "admin" | "customer"
): string {
  return role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME;
}
