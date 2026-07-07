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
