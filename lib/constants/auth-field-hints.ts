import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

export const AUTH_FIELD_HINTS = {
  fullName: `${AUTH_LIMITS.fullName.min}–${AUTH_LIMITS.fullName.max} characters`,
  email: `Valid email format, max ${AUTH_LIMITS.email.max} characters`,
  password: `${AUTH_LIMITS.password.min}–${AUTH_LIMITS.password.max} characters`,
  confirmPassword: `Must match password (${AUTH_LIMITS.password.min}–${AUTH_LIMITS.password.max} characters)`,
} as const;
