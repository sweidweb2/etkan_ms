import { ROLES, type RoleValue } from "@/lib/constants/roles";

export function canAccessAdmin(
  role: RoleValue | null | undefined
): boolean {
  return role === ROLES.ADMIN;
}

export function canEditProfile(
  userId: string,
  authUserId: string | null | undefined
): boolean {
  return !!authUserId && userId === authUserId;
}
