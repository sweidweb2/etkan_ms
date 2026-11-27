import { logOpsWarn } from "@/lib/ops/logger";

/** Shared ops log shape when a rate-limit check rejects a request. */
export function logRateLimitBlocked(
  scope: string,
  message: string,
  meta: {
    ip: string;
    retryAfterMs: number;
    kind?: string;
  }
): void {
  logOpsWarn(scope, message, meta);
}
