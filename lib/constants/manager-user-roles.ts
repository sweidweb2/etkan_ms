import { ROLES } from "@/lib/constants/roles";

/** Roles a manager can assign when creating a user (students excluded). */
export const MANAGER_CREATABLE_ROLES = [
  ROLES.TEACHER,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.CEO,
] as const;

export type ManagerCreatableRole = (typeof MANAGER_CREATABLE_ROLES)[number];

export const MANAGER_CREATABLE_ROLE_LABELS: Record<
  ManagerCreatableRole,
  string
> = {
  [ROLES.TEACHER]: "Teacher",
  [ROLES.MANAGER]: "Manager",
  [ROLES.ADMIN]: "Admin",
  [ROLES.CEO]: "CEO",
};
