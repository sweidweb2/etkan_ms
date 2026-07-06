import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

export const AUTH_FIELD_HINTS = {
  username: `${AUTH_LIMITS.username.min}–${AUTH_LIMITS.username.max} characters, letters, numbers, underscores`,
  fullName: `${AUTH_LIMITS.fullName.min}–${AUTH_LIMITS.fullName.max} characters`,
  email: `Valid email format, max ${AUTH_LIMITS.email.max} characters`,
  password: `${AUTH_LIMITS.password.min}–${AUTH_LIMITS.password.max} characters`,
  confirmPassword: `Must match password (${AUTH_LIMITS.password.min}–${AUTH_LIMITS.password.max} characters)`,
  phone: `Optional, max ${AUTH_LIMITS.phone.max} characters`,
  birthDate: "Optional",
} as const;
