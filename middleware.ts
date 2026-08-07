import { type NextRequest, NextResponse } from "next/server";
import {
  getCachedMaintenanceMode,
  setCachedMaintenanceMode,
} from "@/lib/auth/maintenance-mode-cache";
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
import {
  applyAuthCookies,
  createSupabaseMiddlewareClient,
} from "@/lib/supabase/middleware";
import { getMaintenanceMode } from "@/repositories/app-settings.repository";
import {
  roleFromAuthMetadata,
  roleFromJwtClaims,
  resolveUserRole,
  resolveUserRoleForMiddleware,
} from "@/services/role.service";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const MAINTENANCE_PATH = "/maintenance";

const MAINTENANCE_BLOCKED_ROLES: ReadonlySet<RoleValue> = new Set([
  ROLES.STUDENT,
  ROLES.TEACHER,
]);

type MiddlewareSupabase = SupabaseClient<Database>;

type MiddlewareAuth = {
  userId: string | null;
  claimsRole: RoleValue | null;
  /** Present when we fell back to getUser (needed for metadata-only paths). */
  user: User | null;
};

function isTeacherOrStudentPanelPath(pathname: string): boolean {
  return (
    pathname === ROUTES.TEACHER_ROOT ||
    pathname.startsWith(`${ROUTES.TEACHER_ROOT}/`) ||
    pathname === ROUTES.STUDENT_ROOT ||
    pathname.startsWith(`${ROUTES.STUDENT_ROOT}/`)
  );
}

/**
 * Prefer getClaims (local JWT verify / cached JWKS) over getUser (Auth round-trip).
 * Falls back to getUser when claims are unavailable.
 */
async function resolveMiddlewareAuth(
  supabase: MiddlewareSupabase
): Promise<MiddlewareAuth> {
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (!claimsError && claimsData?.claims?.sub) {
    const claims = claimsData.claims as {
      sub: string;
      app_metadata?: { role?: unknown } | null;
      user_metadata?: { role?: unknown } | null;
      role?: unknown;
    };
    return {
      userId: claims.sub,
      claimsRole: roleFromJwtClaims(claims),
      user: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    userId: user?.id ?? null,
    claimsRole: user ? roleFromAuthMetadata(user) : null,
    user,
  };
}

async function resolveMaintenanceMode(
  supabase: MiddlewareSupabase
): Promise<boolean> {
  const cached = getCachedMaintenanceMode();
  if (cached !== null) {
    return cached;
  }
  const value = await getMaintenanceMode(supabase);
  setCachedMaintenanceMode(value);
  return value;
}

async function resolveRole(
  supabase: MiddlewareSupabase,
  auth: MiddlewareAuth
): Promise<RoleValue> {
  if (!auth.userId) {
    return ROLES.STUDENT;
  }

  if (auth.user) {
    return resolveUserRole(supabase, auth.user);
  }

  return resolveUserRoleForMiddleware(supabase, {
    userId: auth.userId,
    claimsRole: auth.claimsRole,
  });
}

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  const redirect = (url: URL) =>
    applyAuthCookies(NextResponse.redirect(url), getResponse());

  const { pathname } = request.nextUrl;
  const debugTiming =
    process.env.ETKAN_DEBUG_TIMING === "1" ||
    (process.env.NODE_ENV === "development" &&
      pathname.startsWith(ROUTES.MANAGER_INSTRUCTORS));
  const mwStart = debugTiming ? performance.now() : 0;

  // Auth JWT check + maintenance flag in parallel (was sequential ~2 round-trips).
  const authStart = debugTiming ? performance.now() : 0;
  const [auth, maintenanceMode] = await Promise.all([
    resolveMiddlewareAuth(supabase),
    resolveMaintenanceMode(supabase),
  ]);
  if (debugTiming) {
    console.info(
      `[etkan:timing mw] ${pathname} auth+maintenance +${(performance.now() - authStart).toFixed(0)}ms`
    );
  }

  if (maintenanceMode) {
    const isMaintenancePage = pathname === MAINTENANCE_PATH;
    const isManagerSettings = pathname === ROUTES.MANAGER_SETTINGS;
    const isAuthRoute = isPublicAuthRoute(pathname);

    if (isMaintenancePage || isManagerSettings || isAuthRoute) {
      if (auth.userId && isGuestOnlyAuthRoute(pathname)) {
        const role = await resolveRole(supabase, auth);
        if (MAINTENANCE_BLOCKED_ROLES.has(role)) {
          return redirect(new URL(MAINTENANCE_PATH, request.url));
        }
        const next = request.nextUrl.searchParams.get("next");
        const redirectTo = getPostLoginRedirect(role, next);
        return redirect(new URL(redirectTo, request.url));
      }
      return getResponse();
    }

    if (auth.userId) {
      const role = await resolveRole(supabase, auth);
      if (MAINTENANCE_BLOCKED_ROLES.has(role)) {
        return redirect(new URL(MAINTENANCE_PATH, request.url));
      }
    } else if (isTeacherOrStudentPanelPath(pathname)) {
      return redirect(new URL(MAINTENANCE_PATH, request.url));
    }
  }

  if (isPublicAuthRoute(pathname)) {
    if (auth.userId && isGuestOnlyAuthRoute(pathname)) {
      const role = await resolveRole(supabase, auth);
      const next = request.nextUrl.searchParams.get("next");
      const redirectTo = getPostLoginRedirect(role, next);
      return redirect(new URL(redirectTo, request.url));
    }
    return getResponse();
  }

  if (pathname === ROUTES.HOME) {
    return getResponse();
  }

  if (isPanelPath(pathname)) {
    if (!auth.userId) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);

      if (hasSupabaseAuthCookies(request.cookies.getAll())) {
        loginUrl.searchParams.set("message", "session_expired");
      } else {
        loginUrl.searchParams.set("next", pathname);
      }

      return redirect(loginUrl);
    }

    const roleStart = debugTiming ? performance.now() : 0;
    const role = await resolveRole(supabase, auth);
    if (debugTiming) {
      console.info(
        `[etkan:timing mw] ${pathname} resolveRole +${(performance.now() - roleStart).toFixed(0)}ms role=${role}`
      );
    }
    const panelRoot = getPanelRootForRole(role);

    if (pathname === panelRoot) {
      return redirect(new URL(getDashboardRouteForRole(role), request.url));
    }

    if (!canAccessPath(pathname, role)) {
      return redirect(new URL(getDashboardRouteForRole(role), request.url));
    }

    if (debugTiming) {
      console.info(
        `[etkan:timing mw] ${pathname} total +${(performance.now() - mwStart).toFixed(0)}ms`
      );
    }
    return getResponse();
  }

  return getResponse();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
