import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth.service";
import { resolveUserRole } from "@/services/role.service";
import { resolveDisplayName } from "@/services/user-display.service";
import type { RoleValue } from "@/lib/constants/roles";

export async function getSessionUser() {
  const client = await createSupabaseServerComponentClient();
  return getCurrentUser(client);
}

export async function getSessionRole(): Promise<RoleValue | null> {
  const client = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(client);

  if (!user) {
    return null;
  }

  return resolveUserRole(client, user);
}

export async function getSessionDisplayName(): Promise<string> {
  const client = await createSupabaseServerComponentClient();
  const user = await getCurrentUser(client);

  if (!user) {
    return "User";
  }

  return resolveDisplayName(client, user);
}
