import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { roleSchema } from "@/lib/validators/role";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function roleFromAuthMetadata(user: User): RoleValue | null {
  const raw = user.app_metadata?.role ?? user.user_metadata?.role;
  const parsed = roleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function resolveUserRole(
  client: Supabase,
  authUser: User
): Promise<RoleValue> {
  const { data, error } = await profileRepository.findRoleById(
    client,
    authUser.id
  );

  if (!error && data?.role) {
    const parsed = roleSchema.safeParse(data.role);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return roleFromAuthMetadata(authUser) ?? ROLES.STUDENT;
}

export async function syncAuthUserRole(
  adminClient: Supabase,
  authUserId: string,
  role: RoleValue
): Promise<void> {
  const { error } = await authRepository.updateAuthUserRole(
    adminClient,
    authUserId,
    role
  );

  if (error) {
    throw new Error(error.message);
  }
}
