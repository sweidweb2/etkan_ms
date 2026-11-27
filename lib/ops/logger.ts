/**
 * Structured console logging for public / unauthenticated ops flows.
 * Prefer `recordManagerAuditLog` for authenticated manager mutations.
 */

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(err.stack ? { stack: err.stack } : {}),
    };
  }

  if (typeof err === "string") {
    return { message: err };
  }

  return { value: err };
}

export function logOpsError(
  scope: string,
  err: unknown,
  meta?: Record<string, unknown>
): void {
  console.error(`[ops] ${scope}`, {
    ...serializeError(err),
    ...(meta ?? {}),
  });
}

export function logOpsWarn(
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  console.warn(`[ops] ${scope}`, {
    message,
    ...(meta ?? {}),
  });
}

export function logOpsInfo(
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  console.info(`[ops] ${scope}`, {
    message,
    ...(meta ?? {}),
  });
}
