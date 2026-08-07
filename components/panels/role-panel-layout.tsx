import { PanelShell } from "@/components/panels/panel-shell";
import { filterPanelNavigation } from "@/lib/auth/filter-panel-navigation";
import { requireRole } from "@/lib/auth/require-role";
import { getSessionPack } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import { getPanelConfigForRole } from "@/lib/panels/config";

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

  const pack = await getSessionPack();
  const panelConfig = getPanelConfigForRole(role);

  let permissionsArray: PermissionKey[] = [];
  let navigation = panelConfig.navigation;

  if (pack.user?.id) {
    permissionsArray = [...pack.permissions];
    navigation = filterPanelNavigation(navigation, pack.permissions, {
      isInstructor: pack.isInstructor,
    });
  }

  return (
    <PanelShell
      variant={panelConfig.variant}
      label={panelConfig.label}
      navigation={navigation}
      displayName={pack.displayName}
      permissions={permissionsArray}
    >
      {children}
    </PanelShell>
  );
}
