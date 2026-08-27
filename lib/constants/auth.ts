import { ROUTES } from "@/lib/constants/routes";

/** Public self-registration. Flip to `true` to re-enable the signup route and action. */
export const PUBLIC_SIGNUP_ENABLED = false;

export const PUBLIC_AUTH_ROUTES = PUBLIC_SIGNUP_ENABLED
  ? ([ROUTES.LOGIN, ROUTES.SIGNUP, ROUTES.CALLBACK] as const)
  : ([ROUTES.LOGIN, ROUTES.CALLBACK] as const);

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isGuestOnlyAuthRoute(pathname: string): boolean {
  return (
    pathname === ROUTES.LOGIN ||
    (PUBLIC_SIGNUP_ENABLED && pathname === ROUTES.SIGNUP)
  );
}
