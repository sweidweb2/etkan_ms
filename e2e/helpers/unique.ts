/** Unique stamp for idempotent E2E creates (emails/names). */
export function e2eStamp(prefix = "e2e"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
