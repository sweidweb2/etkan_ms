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
import {
  NAV_MW_TIMING_HEADER,
  NAV_TIMING_HEADER,
  createNavTripId,
  encodeTimingMarks,
  isNavTimingEnabled,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";
import {
  applyAuthCookies,
  createSupabaseMiddlewareClient,
} from "@/lib/supabase/middleware";
import {
  roleFromAuthMetadata,
  roleFromJwtClaims,
  resolveUserRole,
  resolveUserRoleForMiddleware,
} from "@/services/role.service";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type MiddlewareSupabase = SupabaseClient<Database>;

type MiddlewareAuth = {
  userId: string | null;
  claimsRole: RoleValue | null;
  /** Present when we fell back to getUser (needed for metadata-only paths). */
  user: User | null;
};

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

function attachMwTiming(
  response: NextResponse,
  tripId: string,
  marks: Record<string, number>
): NextResponse {
  if (!isNavTimingEnabled()) return response;
  response.headers.set(NAV_TIMING_HEADER, tripId);
  response.headers.set(NAV_MW_TIMING_HEADER, encodeTimingMarks(marks));
  // Expose to browser fetch() so the client tracer can read them.
  response.headers.append(
    "Access-Control-Expose-Headers",
    `${NAV_TIMING_HEADER}, ${NAV_MW_TIMING_HEADER}`
  );
  return response;
}

/**
 * Route protection only. Maintenance mode is enforced at login / signup
 * auto-session / auth callback — not on every navigation (was a ~0.3–1s
 * app_settings round-trip on cache miss).
 */
export async function middleware(request: NextRequest) {
  const debugOn = isNavTimingEnabled();
  const tripId =
    request.headers.get(NAV_TIMING_HEADER) ??
    (debugOn ? createNavTripId() : "off");
  const t0 = performance.now();
  const marks: Record<string, number> = {};

  // Forward trip id into the RSC request so layouts can correlate.
  if (debugOn) {
    request.headers.set(NAV_TIMING_HEADER, tripId);
  }

  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  const finish = (response: NextResponse) => {
    marks.total = performance.now() - t0;
    if (debugOn) {
      navTimingServerLog(tripId, `middleware ${request.nextUrl.pathname}`, marks);
      return attachMwTiming(response, tripId, marks);
    }
    return response;
  };

  const redirect = (url: URL) =>
    finish(applyAuthCookies(NextResponse.redirect(url), getResponse()));

  const { pathname } = request.nextUrl;

  const authStart = performance.now();
  const auth = await resolveMiddlewareAuth(supabase);
  marks.claims = performance.now() - authStart;

  if (auth.userId && isGuestOnlyAuthRoute(pathname)) {
    const roleStart = performance.now();
    const role = await resolveRole(supabase, auth);
    marks.role = performance.now() - roleStart;
    const next = request.nextUrl.searchParams.get("next");
    const redirectTo = getPostLoginRedirect(role, next);
    return redirect(new URL(redirectTo, request.url));
  }

  if (isPublicAuthRoute(pathname)) {
    return finish(getResponse());
  }

  if (pathname === ROUTES.HOME) {
    return finish(getResponse());
  }

  // Public maintenance page stays reachable without auth work beyond claims.
  if (pathname === "/maintenance") {
    return finish(getResponse());
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

    const roleStart = performance.now();
    const role = await resolveRole(supabase, auth);
    marks.role = performance.now() - roleStart;
    const panelRoot = getPanelRootForRole(role);

    if (pathname === panelRoot) {
      return redirect(new URL(getDashboardRouteForRole(role), request.url));
    }

    if (!canAccessPath(pathname, role)) {
      return redirect(new URL(getDashboardRouteForRole(role), request.url));
    }

    return finish(getResponse());
  }

  return finish(getResponse());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
