"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearClaimsRoleOverride } from "@/lib/auth/claims-role-override-cache";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { TOAST_QUERY_KEYS } from "@/lib/constants/toast-messages";
import { appendQueryParam } from "@/lib/url/append-query-param";
import {
  getSessionAuthIdentity,
  logout,
} from "@/services/auth/auth.service";

async function clearLogoutCachesForCurrentUser(): Promise<void> {
  const client = await createSupabaseServerActionClient();
  // Resolve identity before sign-out so we only clear this user's process caches.
  // Clearing all overrides would wipe demotions for other users on this instance.
  const identity = await getSessionAuthIdentity(client);
  const userId = identity?.user.id;
  await logout(client);
  if (userId) {
    clearCachedSessionShell(userId);
    clearClaimsRoleOverride(userId);
  }
}

export async function logoutAction(): Promise<void> {
  await clearLogoutCachesForCurrentUser();
  revalidatePath("/", "layout");
  redirect(`${ROUTES.LOGIN}?toast=signed_out`);
}

export async function logoutDueToInactivityAction(): Promise<void> {
  await clearLogoutCachesForCurrentUser();
  revalidatePath("/", "layout");
  redirect(
    appendQueryParam(ROUTES.LOGIN, TOAST_QUERY_KEYS.info, "session_expired")
  );
}
