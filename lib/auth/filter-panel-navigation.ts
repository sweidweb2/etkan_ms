import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import type { PermissionKey } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import type {
  PanelNavGroup,
  PanelNavItem,
  PanelNavigation,
} from "@/types/panel";

export type FilterPanelNavigationOptions = {
  isInstructor?: boolean;
};

function isManageWorkshopsHref(href: string): boolean {
  return (
    href === ROUTES.MANAGER_WORKSHOPS ||
    href.startsWith(`${ROUTES.MANAGER_WORKSHOPS}/`)
  );
}

function canViewNavItem(
  item: PanelNavItem,
  permissions: ReadonlySet<PermissionKey>,
  options: FilterPanelNavigationOptions
): boolean {
  const required = getRequiredViewPermissionForManagerPath(item.href);

  if (!required) {
    // Role-native panel links (non-/manager) stay visible.
    return !item.href.startsWith(`${ROUTES.MANAGER_ROOT}/`) &&
      item.href !== ROUTES.MANAGER_ROOT;
  }

  if (!hasPermissionInSet(permissions, required)) {
    return false;
  }

  if (isManageWorkshopsHref(item.href)) {
    return options.isInstructor === true;
  }

  return true;
}

function filterNavItems(
  items: PanelNavItem[] | undefined,
  permissions: ReadonlySet<PermissionKey>,
  options: FilterPanelNavigationOptions
): PanelNavItem[] | undefined {
  if (!items?.length) {
    return items;
  }
  return items.filter((item) => canViewNavItem(item, permissions, options));
}

function filterNavGroups(
  groups: PanelNavGroup[] | undefined,
  permissions: ReadonlySet<PermissionKey>,
  options: FilterPanelNavigationOptions
): PanelNavGroup[] | undefined {
  if (!groups?.length) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canViewNavItem(item, permissions, options)
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Keep nav items whose href maps to a granted manager view permission,
 * plus role-native (non-manager) links.
 * Manage workshops also requires `isInstructor`.
 */
export function filterPanelNavigation(
  navigation: PanelNavigation,
  permissions: ReadonlySet<PermissionKey>,
  options: FilterPanelNavigationOptions = {}
): PanelNavigation {
  return {
    items: filterNavItems(navigation.items, permissions, options),
    groups: filterNavGroups(navigation.groups, permissions, options),
  };
}
