import { PanelShell } from "@/components/panels/panel-shell";
import { requireAdmin } from "@/lib/auth/require-role";
import { ADMIN_PANEL_NAV } from "@/lib/constants/panel-nav";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <PanelShell variant="admin" label="Admin" navItems={ADMIN_PANEL_NAV}>
      {children}
    </PanelShell>
  );
}
