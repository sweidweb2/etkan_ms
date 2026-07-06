export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  CEO: "ceo",
  TEACHER: "teacher",
  STUDENT: "student",
} as const;

export const ROLE_VALUES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.CEO,
  ROLES.TEACHER,
  ROLES.STUDENT,
] as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
