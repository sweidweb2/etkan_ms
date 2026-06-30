/** Shared auth field bounds (HTML attributes + Zod). */
export const AUTH_LIMITS = {
  fullName: { min: 2, max: 100 },
  email: { min: 5, max: 255 },
  password: { min: 5, max: 72 },
} as const;

export const AUTH_RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
} as const;
