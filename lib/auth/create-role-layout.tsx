import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/require-role";
import type { RoleValue } from "@/lib/constants/roles";

/**
 * Thin panel layouts that only gate by role.
 * Manager keeps a custom layout (shared-path + permission checks).
 */
export function createRoleLayout(expected: RoleValue) {
  return async function RoleLayout({
    children,
  }: {
    children: ReactNode;
  }) {
    await requireRole(expected);
    return children;
  };
}
