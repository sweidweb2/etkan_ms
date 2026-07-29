import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import type { PermissionKey } from "@/lib/constants/permissions";
import type {
  PanelNavGroup,
  PanelNavItem,
  PanelNavigation,
} from "@/types/panel";

function canViewNavItem(
  item: PanelNavItem,
  permissions: ReadonlySet<PermissionKey>
): boolean {
  const required = getRequiredViewPermissionForManagerPath(item.href);
  if (!required) {
    return false;
  }
  return hasPermissionInSet(permissions, required);
}

function filterNavItems(
  items: PanelNavItem[] | undefined,
  permissions: ReadonlySet<PermissionKey>
): PanelNavItem[] | undefined {
  if (!items?.length) {
    return items;
  }
  const filtered = items.filter((item) => canViewNavItem(item, permissions));
  return filtered;
}

function filterNavGroups(
  groups: PanelNavGroup[] | undefined,
  permissions: ReadonlySet<PermissionKey>
): PanelNavGroup[] | undefined {
  if (!groups?.length) {
    return groups;
  }
  const filtered = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewNavItem(item, permissions)),
    }))
    .filter((group) => group.items.length > 0);
  return filtered;
}

/**
 * Keep manager nav items whose href maps to a granted `*.view` permission.
 * Drops empty groups. Safe to call with a full permission set (no-op visually).
 */
export function filterPanelNavigation(
  navigation: PanelNavigation,
  permissions: ReadonlySet<PermissionKey>
): PanelNavigation {
  return {
    items: filterNavItems(navigation.items, permissions),
    groups: filterNavGroups(navigation.groups, permissions),
  };
}
