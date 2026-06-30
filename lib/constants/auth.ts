import { ROUTES } from "@/lib/constants/routes";

export const PUBLIC_AUTH_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.CALLBACK,
] as const;

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isGuestOnlyAuthRoute(pathname: string): boolean {
  return pathname === ROUTES.LOGIN || pathname === ROUTES.SIGNUP;
}
