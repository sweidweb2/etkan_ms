/** Ashlilie is admin-only; `customer` remains in the enum for legacy compatibility. */
export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
} as const;

export const ROLE_VALUES = [ROLES.ADMIN, ROLES.CUSTOMER] as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
