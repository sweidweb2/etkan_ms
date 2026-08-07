import {
  consumeRateLimit,
  formatRetryAfter,
} from "@/lib/rate-limit/memory-store";
import { getClientIp } from "@/lib/rate-limit/client-ip";

const PUBLIC_FORM_SUBMIT_LIMIT = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
} as const;

export async function checkPublicFinancialFormSubmitRateLimit(
  token: string
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  const ip = await getClientIp();
  const key = `financial-form-submit:${ip}:${token}`;

  const result = consumeRateLimit(
    key,
    PUBLIC_FORM_SUBMIT_LIMIT.maxAttempts,
    PUBLIC_FORM_SUBMIT_LIMIT.windowMs
  );

  if (result.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Too many submit attempts. Try again in ${formatRetryAfter(result.retryAfterMs)}.`,
  };
}
