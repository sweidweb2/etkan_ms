import { cache } from "react";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { resolveUserRole } from "@/services/role.service";
import { resolveDisplayName } from "@/services/user-display.service";
import type { AuditActor } from "@/services/audit-log.service";
import type { RoleValue } from "@/lib/constants/roles";

export const getSessionUser = cache(async () => {
  const client = await createSupabaseServerComponentClient();
  return getCurrentUser(client);
});

export const getSessionRole = cache(async (): Promise<RoleValue | null> => {
  const client = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(client);

  if (!user) {
    return null;
  }

  return resolveUserRole(client, user);
});

export async function getSessionDisplayName(): Promise<string> {
  const client = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(client);

  if (!user) {
    return "User";
  }

  return resolveDisplayName(client, user);
}

export async function getSessionAuditActor(): Promise<AuditActor> {
  const [user, userLabel] = await Promise.all([
    getSessionUser(),
    getSessionDisplayName(),
  ]);

  return {
    userId: user?.id ?? null,
    userLabel: userLabel || "System",
  };
}
