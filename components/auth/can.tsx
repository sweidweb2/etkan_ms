"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/components/auth/permissions-provider";
import {
  hasAllPermissionsInSet,
  hasAnyPermissionInSet,
  hasPermissionInSet,
} from "@/lib/auth/permission-checks";
import type { PermissionKey } from "@/lib/constants/permissions";

type CanBaseProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type CanPermissionProps = CanBaseProps & {
  permission: PermissionKey;
  anyOf?: never;
  allOf?: never;
};

type CanAnyOfProps = CanBaseProps & {
  permission?: never;
  anyOf: readonly PermissionKey[];
  allOf?: never;
};

type CanAllOfProps = CanBaseProps & {
  permission?: never;
  anyOf?: never;
  allOf: readonly PermissionKey[];
};

export type CanProps = CanPermissionProps | CanAnyOfProps | CanAllOfProps;

/**
 * Renders children only when the current user holds the required permission(s).
 * Cosmetic only — server actions must still assert permissions.
 */
export function Can(props: CanProps) {
  const permissions = usePermissions();
  const { children, fallback = null } = props;

  let allowed = false;
  if ("permission" in props && props.permission) {
    allowed = hasPermissionInSet(permissions, props.permission);
  } else if ("anyOf" in props && props.anyOf) {
    allowed = hasAnyPermissionInSet(permissions, props.anyOf);
  } else if ("allOf" in props && props.allOf) {
    allowed = hasAllPermissionsInSet(permissions, props.allOf);
  }

  return allowed ? children : fallback;
}
