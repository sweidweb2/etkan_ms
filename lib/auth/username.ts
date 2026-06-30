export function baseUsernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const sanitized = local.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (sanitized || "user").slice(0, 45);
}

export function usernameWithSuffix(base: string, suffix: number): string {
  const suffixStr = String(suffix);
  const trimmedBase = base.slice(0, Math.max(1, 50 - suffixStr.length));
  return `${trimmedBase}${suffixStr}`;
}
