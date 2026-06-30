import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

/** Practical email pattern (RFC 5322–inspired, not exhaustive). */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailField = z
  .string()
  .trim()
  .min(1, { message: "Email is required." })
  .max(AUTH_LIMITS.email.max, {
    message: `Email must be at most ${AUTH_LIMITS.email.max} characters.`,
  })
  .regex(EMAIL_REGEX, {
    message: "Please enter a valid email address.",
  });

export const passwordField = z
  .string()
  .min(AUTH_LIMITS.password.min, {
    message: `Password must be at least ${AUTH_LIMITS.password.min} characters.`,
  })
  .max(AUTH_LIMITS.password.max, {
    message: `Password must be at most ${AUTH_LIMITS.password.max} characters.`,
  });

export const fullNameField = z
  .string()
  .trim()
  .min(AUTH_LIMITS.fullName.min, {
    message: `Full name must be at least ${AUTH_LIMITS.fullName.min} characters.`,
  })
  .max(AUTH_LIMITS.fullName.max, {
    message: `Full name must be at most ${AUTH_LIMITS.fullName.max} characters.`,
  });
