export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  CO_MANAGER: "co-manager",
  CEO: "ceo",
  SUPERVISOR: "supervisor",
  CRM: "crm",
  TEACHER: "teacher",
  TRAINER: "trainer",
  STUDENT: "student",
} as const;

export const ROLE_VALUES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.CO_MANAGER,
  ROLES.CEO,
  ROLES.SUPERVISOR,
  ROLES.CRM,
  ROLES.TEACHER,
  ROLES.TRAINER,
  ROLES.STUDENT,
] as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
