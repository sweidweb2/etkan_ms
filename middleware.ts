import { type NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuthCookies } from "@/lib/auth/session-cookies";
import { canAccessPath, isPanelPath } from "@/lib/auth/path-access";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import {
  isGuestOnlyAuthRoute,
  isPublicAuthRoute,
} from "@/lib/constants/auth";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  getDashboardRouteForRole,
  getPanelRootForRole,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { resolveUserRole } from "@/services/role.service";
import { getMaintenanceMode } from "@/repositories/app-settings.repository";

const MAINTENANCE_PATH = "/maintenance";

const MAINTENANCE_BLOCKED_ROLES: ReadonlySet<RoleValue> = new Set([
  ROLES.STUDENT,
  ROLES.TEACHER,
]);

function isTeacherOrStudentPanelPath(pathname: string): boolean {
  return (
    pathname === ROUTES.TEACHER_ROOT ||
    pathname.startsWith(`${ROUTES.TEACHER_ROOT}/`) ||
    pathname === ROUTES.STUDENT_ROOT ||
    pathname.startsWith(`${ROUTES.STUDENT_ROOT}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const maintenanceMode = await getMaintenanceMode(supabase);

  if (maintenanceMode) {
    const isMaintenancePage = pathname === MAINTENANCE_PATH;
    const isManagerSettings = pathname === ROUTES.MANAGER_SETTINGS;
    const isAuthRoute = isPublicAuthRoute(pathname);

    if (isMaintenancePage || isManagerSettings || isAuthRoute) {
      if (user && isGuestOnlyAuthRoute(pathname)) {
        const role = await resolveUserRole(supabase, user);
        if (MAINTENANCE_BLOCKED_ROLES.has(role)) {
          return NextResponse.redirect(new URL(MAINTENANCE_PATH, request.url));
        }
        const next = request.nextUrl.searchParams.get("next");
        const redirectTo = getPostLoginRedirect(role, next);
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      return response;
    }

    if (user) {
      const role = await resolveUserRole(supabase, user);
      if (MAINTENANCE_BLOCKED_ROLES.has(role)) {
        return NextResponse.redirect(new URL(MAINTENANCE_PATH, request.url));
      }
    } else if (isTeacherOrStudentPanelPath(pathname)) {
      return NextResponse.redirect(new URL(MAINTENANCE_PATH, request.url));
    }
  }

  if (isPublicAuthRoute(pathname)) {
    if (user && isGuestOnlyAuthRoute(pathname)) {
      const role = await resolveUserRole(supabase, user);
      const next = request.nextUrl.searchParams.get("next");
      const redirectTo = getPostLoginRedirect(role, next);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return response;
  }

  if (pathname === ROUTES.HOME) {
    return response;
  }

  if (isPanelPath(pathname)) {
    if (!user) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);

      if (hasSupabaseAuthCookies(request.cookies.getAll())) {
        loginUrl.searchParams.set("message", "session_expired");
      } else {
        loginUrl.searchParams.set("next", pathname);
      }

      return NextResponse.redirect(loginUrl);
    }

    const role = await resolveUserRole(supabase, user);
    const panelRoot = getPanelRootForRole(role);

    if (pathname === panelRoot) {
      return NextResponse.redirect(
        new URL(getDashboardRouteForRole(role), request.url)
      );
    }

    if (!canAccessPath(pathname, role)) {
      return NextResponse.redirect(
        new URL(getDashboardRouteForRole(role), request.url)
      );
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
