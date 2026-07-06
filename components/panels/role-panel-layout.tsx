import { PanelShell } from "@/components/panels/panel-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getSessionDisplayName } from "@/lib/auth/session";
import { getPanelConfigForRole } from "@/lib/panels/config";
import { ROLES } from "@/lib/constants/roles";

type RolePanelLayoutProps = {
  role: (typeof ROLES)[keyof typeof ROLES];
  children: React.ReactNode;
};

export async function RolePanelLayout({ role, children }: RolePanelLayoutProps) {
  await requireRole(role);
  const [displayName, panelConfig] = await Promise.all([
    getSessionDisplayName(),
    Promise.resolve(getPanelConfigForRole(role)),
  ]);

  return (
    <PanelShell
      variant={panelConfig.variant}
      label={panelConfig.label}
      navItems={panelConfig.navItems}
      displayName={displayName}
    >
      {children}
    </PanelShell>
  );
}
