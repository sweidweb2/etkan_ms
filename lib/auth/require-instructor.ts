import { forbidden, redirect } from "next/navigation";
import { getSessionRole, getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getDashboardRouteForRole,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import * as profileRepository from "@/repositories/profile.repository";
import {
  getUserPermissionsCached,
  hasPermissionInSet,
} from "@/services/authorization.service";

/**
 * Gate for instructor feature routes (`/instructor/*`).
 * Requires an authenticated user with `profiles.is_instructor = true`
 * and `instructor_portal.view`.
 */
export async function requireInstructor(): Promise<{
  userId: string;
  role: NonNullable<Awaited<ReturnType<typeof getSessionRole>>>;
}> {
  const user = await getSessionUser();
  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const role = await getSessionRole();
  if (!role) {
    redirect(ROUTES.LOGIN);
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile, error } = await profileRepository.findProfileById(
    adminClient,
    user.id
  );

  if (error || !profile) {
    redirect(getDashboardRouteForRole(role));
  }

  if (!profile.is_instructor) {
    redirect(getDashboardRouteForRole(role));
  }

  const permissions = await getUserPermissionsCached(user.id);
  if (!hasPermissionInSet(permissions, PERMISSIONS.INSTRUCTOR_PORTAL_VIEW)) {
    forbidden();
  }

  return { userId: user.id, role };
}
