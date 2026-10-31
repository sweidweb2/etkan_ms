import { AUTH_RATE_LIMITS } from "@/lib/constants/auth-limits";
import {
  consumeRateLimit,
  formatRetryAfter,
} from "@/lib/rate-limit/memory-store";
import { getClientIp } from "@/lib/rate-limit/client-ip";

export type AuthRateLimitKind = "login" | "signup";

export async function checkAuthRateLimit(
  kind: AuthRateLimitKind
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  // Playwright E2E performs many UI logins (setup + role redirects). Production
  // caps stay strict; local/dev and explicit E2E opt-out must not flake the suite.
  if (
    process.env.E2E_DISABLE_AUTH_RATE_LIMIT === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    return { allowed: true };
  }

  const ip = await getClientIp();
  const config = AUTH_RATE_LIMITS[kind];
  const key = `auth:${kind}:${ip}`;

  const result = consumeRateLimit(
    key,
    config.maxAttempts,
    config.windowMs
  );

  if (result.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Too many ${kind === "login" ? "sign-in" : "sign-up"} attempts. Try again in ${formatRetryAfter(result.retryAfterMs)}.`,
  };
}
