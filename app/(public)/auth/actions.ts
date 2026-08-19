"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearCachedAuthEmails } from "@/lib/auth/auth-emails-cache";
import { clearCachedRolePermissionKeys } from "@/lib/auth/role-permissions-cache";
import { clearCachedSessionShell } from "@/lib/auth/session-shell-cache";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { TOAST_QUERY_KEYS } from "@/lib/constants/toast-messages";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { logout } from "@/services/auth/auth.service";

export async function logoutAction(): Promise<void> {
  const client = await createSupabaseServerActionClient();
  await logout(client);
  clearCachedSessionShell();
  clearCachedRolePermissionKeys();
  clearCachedAuthEmails();
  revalidatePath("/", "layout");
  redirect(`${ROUTES.LOGIN}?toast=signed_out`);
}

export async function logoutDueToInactivityAction(): Promise<void> {
  const client = await createSupabaseServerActionClient();
  await logout(client);
  clearCachedSessionShell();
  clearCachedRolePermissionKeys();
  clearCachedAuthEmails();
  revalidatePath("/", "layout");
  redirect(
    appendQueryParam(ROUTES.LOGIN, TOAST_QUERY_KEYS.info, "session_expired")
  );
}
