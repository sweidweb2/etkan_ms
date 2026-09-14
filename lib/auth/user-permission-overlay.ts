import {
  isPermissionKey,
  type PermissionKey,
} from "@/lib/constants/permissions";

export type OverlayAllowRow = {
  permission_key: PermissionKey;
  effect: "allow";
};

/**
 * Normalize overlay inputs to unique allow keys (sorted).
 * Invalid keys and non-allow effects are skipped.
 */
export function normalizeAllowKeys(
  rows: readonly { permission_key: string; effect?: string }[]
): PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const row of rows) {
    if (row.effect !== undefined && row.effect !== "allow") {
      continue;
    }
    if (isPermissionKey(row.permission_key)) {
      keys.add(row.permission_key);
    }
  }
  return [...keys].sort();
}

/**
 * Drop allows already covered by the role baseline (true privates only).
 */
export function stripRedundantAllows(
  allowKeys: readonly PermissionKey[],
  roleKeys: ReadonlySet<PermissionKey> | readonly PermissionKey[]
): PermissionKey[] {
  const roleSet =
    roleKeys instanceof Set
      ? roleKeys
      : new Set<PermissionKey>(roleKeys);
  return allowKeys.filter((key) => !roleSet.has(key)).sort();
}

export function toOverlayAllowRows(
  allowKeys: readonly PermissionKey[]
): OverlayAllowRow[] {
  return allowKeys.map((permission_key) => ({
    permission_key,
    effect: "allow" as const,
  }));
}

export function overlaySnapshot(allowKeys: readonly PermissionKey[]) {
  return {
    rows: toOverlayAllowRows(allowKeys),
  };
}
