import { headers } from "next/headers";
import { NavTimingBeacon } from "@/components/debug/nav-timing-beacon";
import { PanelShell } from "@/components/panels/panel-shell";
import { filterPanelNavigation } from "@/lib/auth/filter-panel-navigation";
import { requireRole } from "@/lib/auth/require-role";
import { getNavRscTimingBag, getSessionPack } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import {
  NAV_TIMING_HEADER,
  isNavTimingEnabled,
  navNowMs,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";
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
  const debugOn = isNavTimingEnabled();
  const layoutStart = debugOn ? navNowMs() : 0;
  const tripId = debugOn
    ? ((await headers()).get(NAV_TIMING_HEADER) ?? null)
    : null;

  await requireRole(role);
  if (assertAccess) {
    const gateStart = debugOn ? navNowMs() : 0;
    await assertAccess();
    if (debugOn) {
      getNavRscTimingBag().assert_access = navNowMs() - gateStart;
    }
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

  const bag = debugOn ? getNavRscTimingBag() : null;
  if (bag) {
    bag.role_panel_layout = navNowMs() - layoutStart;
    navTimingServerLog(tripId ?? "rsc", "role_panel_layout", {
      layout: bag.role_panel_layout,
      session_pack: bag.session_pack ?? 0,
      session_claims: bag.session_claims ?? 0,
      shell_hit: bag.session_shell_hit ?? -1,
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
      {debugOn && tripId && bag ? (
        <NavTimingBeacon tripId={tripId} marks={{ ...bag }} />
      ) : null}
      {children}
    </PanelShell>
  );
}
