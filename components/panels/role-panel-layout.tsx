import { PanelShell } from "@/components/panels/panel-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getSessionDisplayName } from "@/lib/auth/session";
import { getPanelConfigForRole } from "@/lib/panels/config";
import { ROLES } from "@/lib/constants/roles";

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
  const [displayName, panelConfig] = await Promise.all([
    getSessionDisplayName(),
    Promise.resolve(getPanelConfigForRole(role)),
  ]);

  return (
    <PanelShell
      variant={panelConfig.variant}
      label={panelConfig.label}
      navigation={panelConfig.navigation}
      displayName={displayName}
    >
      {children}
    </PanelShell>
  );
}
