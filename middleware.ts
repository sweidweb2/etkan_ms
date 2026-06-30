import { type NextRequest, NextResponse } from "next/server";
import { canAccessPath } from "@/lib/auth/path-access";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import {
  isGuestOnlyAuthRoute,
  isPublicAuthRoute,
} from "@/lib/constants/auth";
import { ROLES } from "@/lib/constants/roles";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { resolveUserRole } from "@/services/role.service";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

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
    if (user) {
      const role = await resolveUserRole(supabase, user);
      if (role === ROLES.ADMIN) {
        return NextResponse.redirect(
          new URL(ROUTES.ADMIN_DASHBOARD, request.url)
        );
      }
    }
    return response;
  }

  if (!user) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = await resolveUserRole(supabase, user);

  if (pathname === ROUTES.ADMIN_ROOT) {
    return NextResponse.redirect(new URL(ROUTES.ADMIN_DASHBOARD, request.url));
  }

  if (!canAccessPath(pathname, role)) {
    return NextResponse.redirect(
      new URL(getDashboardRouteForRole(role), request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
