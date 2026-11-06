import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

export const AUTH_FIELD_HINTS = {
  fullName: `${AUTH_LIMITS.fullName.min}–${AUTH_LIMITS.fullName.max} chars`,
  email: `Valid email · max ${AUTH_LIMITS.email.max}`,
  password: `${AUTH_LIMITS.password.min}–${AUTH_LIMITS.password.max} chars`,
  confirmPassword: `Must match password`,
  passwordOptional: `Optional · blank uses default`,
  confirmPasswordOptional: `Required if password set`,
  phone: `Optional · max ${AUTH_LIMITS.phone.max}`,
  birthDate: "Optional · not in the future",
} as const;
