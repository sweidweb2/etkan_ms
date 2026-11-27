import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Authorize cron HTTP routes with `Authorization: Bearer $CRON_SECRET`.
 * Fail closed when the secret is unset. Compare with constant-time equality.
 */
export function isCronRequestAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const provided = header.slice("Bearer ".length);
  return timingSafeEqualString(provided, secret);
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    // Keep work roughly constant when lengths differ.
    timingSafeEqual(leftBuf, leftBuf);
    return false;
  }
  return timingSafeEqual(leftBuf, rightBuf);
}
