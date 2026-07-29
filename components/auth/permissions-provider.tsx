"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { PermissionKey } from "@/lib/constants/permissions";

const PermissionsContext = createContext<ReadonlySet<PermissionKey> | null>(
  null
);

type PermissionsProviderProps = {
  permissions: readonly PermissionKey[];
  children: ReactNode;
};

export function PermissionsProvider({
  permissions,
  children,
}: PermissionsProviderProps) {
  const value = useMemo(
    () => new Set<PermissionKey>(permissions),
    [permissions]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): ReadonlySet<PermissionKey> {
  const permissions = useContext(PermissionsContext);
  if (!permissions) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return permissions;
}
