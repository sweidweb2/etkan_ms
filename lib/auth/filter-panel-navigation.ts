import { getRequiredViewPermissionForManagerPath } from "@/lib/auth/manager-route-permissions";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { canAccessManageWorkshops } from "@/lib/auth/workshop-attribute-access";
import type { PermissionKey } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import type {
  PanelNavGroup,
  PanelNavItem,
  PanelNavigation,
} from "@/types/panel";

export type FilterPanelNavigationOptions = {
  isInstructor?: boolean;
  role?: RoleValue | null;
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
  // Hub route: any manager-panel session can open Pages; cards inside are filtered.
  if (item.href === ROUTES.MANAGER_PAGES) {
    return true;
  }

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
    return canAccessManageWorkshops(options);
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
 * Manage workshops also requires instructor (or manager/supervisor role).
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
