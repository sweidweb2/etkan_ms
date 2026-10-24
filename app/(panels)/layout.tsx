import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { getNavRscTimingBag, getSessionRole } from "@/lib/auth/session";
import { SITE } from "@/lib/config/site";
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
 *
 * Panels read session cookies and admin-only data. They must stay
 * request-time so `next build` does not prerender them without secrets.
 * Keep this even if a future refactor temporarily drops a cookies() call
 * from this layout — panels are never marketing-ISR candidates.
 */
export const dynamic = "force-dynamic";

/** Panels are the Management System — keep the MS brand here.
 * `absolute` blocks the public root template (`%s | Etkan`). */
export const metadata: Metadata = {
  title: {
    absolute: SITE.systemName,
    default: SITE.systemName,
    template: `%s | ${SITE.systemName}`,
  },
  applicationName: SITE.systemName,
};

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
