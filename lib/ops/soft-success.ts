import { logOpsWarn } from "@/lib/ops/logger";

/**
 * Merge soft-success warnings so later failures (e.g. payment sync) are not
 * hidden by an earlier seed/optional-step warning.
 */
export function coalesceWarning(
  current: string | undefined,
  next: string | undefined
): string | undefined {
  const a = current?.trim();
  const b = next?.trim();
  if (!a) {
    return b || undefined;
  }
  if (!b) {
    return a;
  }
  if (a === b || a.includes(b)) {
    return a;
  }
  if (b.includes(a)) {
    return b;
  }
  return `${a} ${b}`;
}

/** Normalize unknown failures into a stable user-facing warning string. */
export function messageFromUnknown(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

/**
 * Log a non-fatal side-effect failure and return the warning string to attach
 * to an otherwise successful mutation result.
 * Pass `userMessage` when ops logs should keep the detail but the UI stays stable.
 */
export function warnSoftFailure(
  scope: string,
  error: unknown,
  fallback: string,
  meta?: Record<string, unknown>,
  options?: { userMessage?: string }
): string {
  const detail = messageFromUnknown(error, fallback);
  logOpsWarn(scope, detail, meta);
  return options?.userMessage ?? detail;
}
