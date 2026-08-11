import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { getNavRscTimingBag, getSessionRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import {
  NAV_TIMING_HEADER,
  isNavTimingEnabled,
  navNowMs,
  navTimingServerLog,
} from "@/lib/debug/nav-timing";

/**
 * Shared shell for all role panels.
 * Keeping one layout parent means sidebar/header stay mounted when
 * navigating between role panel segments.
 */
export default async function PanelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const debugOn = isNavTimingEnabled();
  const start = debugOn ? navNowMs() : 0;
  const tripId = debugOn
    ? ((await headers()).get(NAV_TIMING_HEADER) ?? null)
    : null;

  const role = await getSessionRole();
  if (!role) {
    redirect(ROUTES.LOGIN);
  }

  if (debugOn) {
    const bag = getNavRscTimingBag();
    bag.panels_layout = navNowMs() - start;
    navTimingServerLog(tripId ?? "rsc", "panels_layout", {
      panels_layout: bag.panels_layout,
    });
  }

  return <RolePanelLayout role={role}>{children}</RolePanelLayout>;
}
