import {
  consumeRateLimit,
  formatRetryAfter,
} from "@/lib/rate-limit/memory-store";
import { getClientIp } from "@/lib/rate-limit/client-ip";

const PUBLIC_REGISTRATION_SUBMIT_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

const PUBLIC_REGISTRATION_UPLOAD_LIMIT = {
  maxAttempts: 20,
  windowMs: 15 * 60 * 1000,
} as const;

export async function checkPublicRegistrationSubmitRateLimit(): Promise<
  { allowed: true } | { allowed: false; message: string }
> {
  const ip = await getClientIp();
  const key = `registration-submit:${ip}`;

  const result = consumeRateLimit(
    key,
    PUBLIC_REGISTRATION_SUBMIT_LIMIT.maxAttempts,
    PUBLIC_REGISTRATION_SUBMIT_LIMIT.windowMs
  );

  if (result.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Too many submit attempts. Try again in ${formatRetryAfter(result.retryAfterMs)}.`,
  };
}

export async function checkPublicRegistrationUploadRateLimit(): Promise<
  { allowed: true } | { allowed: false; message: string }
> {
  const ip = await getClientIp();
  const key = `registration-upload:${ip}`;

  const result = consumeRateLimit(
    key,
    PUBLIC_REGISTRATION_UPLOAD_LIMIT.maxAttempts,
    PUBLIC_REGISTRATION_UPLOAD_LIMIT.windowMs
  );

  if (result.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Too many upload attempts. Try again in ${formatRetryAfter(result.retryAfterMs)}.`,
  };
}
