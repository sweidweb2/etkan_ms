import { PanelShell } from "@/components/panels/panel-shell";
import { filterPanelNavigation } from "@/lib/auth/filter-panel-navigation";
import { requireRole } from "@/lib/auth/require-role";
import {
  getSessionDisplayName,
  getSessionUser,
} from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import { getPanelConfigForRole } from "@/lib/panels/config";
import { getUserPermissionsCached } from "@/services/authorization.service";

type RolePanelLayoutProps = {
  role: (typeof ROLES)[keyof typeof ROLES];
  children: React.ReactNode;
  /** Runs after role check (e.g. manager route view-permission gate). */
  assertAccess?: () => Promise<void>;
};

export async function RolePanelLayout({
  role,
  children,
  assertAccess,
}: RolePanelLayoutProps) {
  await requireRole(role);
  if (assertAccess) {
    await assertAccess();
  }

  const [displayName, panelConfig, user] = await Promise.all([
    getSessionDisplayName(),
    Promise.resolve(getPanelConfigForRole(role)),
    getSessionUser(),
  ]);

  let permissionsArray: PermissionKey[] = [];
  let navigation = panelConfig.navigation;

  if (user?.id) {
    const permissions = await getUserPermissionsCached(user.id);
    permissionsArray = [...permissions];

    if (role === ROLES.MANAGER) {
      navigation = filterPanelNavigation(navigation, permissions);
    }
  }

  return (
    <PanelShell
      variant={panelConfig.variant}
      label={panelConfig.label}
      navigation={navigation}
      displayName={displayName}
      permissions={permissionsArray}
    >
      {children}
    </PanelShell>
  );
}
