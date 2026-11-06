/** Shared auth field bounds (HTML attributes + Zod). */
export const AUTH_LIMITS = {
  fullName: { min: 2, max: 100 },
  email: { min: 5, max: 255 },
  password: { min: 5, max: 72 },
  phone: { max: 20 },
} as const;

export const AUTH_RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
} as const;

/** Used when manager create forms leave password blank. */
export const DEFAULT_CREATED_STUDENT_PASSWORD = "password";

/** Inactivity window before server/client session logout (matches Supabase config). */
export const SESSION_INACTIVITY_MS = 3 * 60 * 60 * 1000;
