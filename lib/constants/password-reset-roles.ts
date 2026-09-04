import { ROLES } from "@/lib/constants/roles";

/** Roles eligible for bulk password reset (excludes manager and ceo). */
export const PASSWORD_RESET_BY_ROLE_VALUES = [
  ROLES.ADMIN,
  ROLES.CO_MANAGER,
  ROLES.SUPERVISOR,
  ROLES.TEACHER,
  ROLES.TRAINER,
  ROLES.STUDENT,
] as const;

export type PasswordResetByRoleValue =
  (typeof PASSWORD_RESET_BY_ROLE_VALUES)[number];

export function isPasswordResetByRoleValue(
  value: string
): value is PasswordResetByRoleValue {
  return (PASSWORD_RESET_BY_ROLE_VALUES as readonly string[]).includes(value);
}
