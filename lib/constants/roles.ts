/** Bedrock auth uses `admin` for panel access; `customer` remains for legacy template compatibility. */
export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
} as const;

export const ROLE_VALUES = [ROLES.ADMIN, ROLES.CUSTOMER] as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
