import { ManagerReportsPanel } from "@/components/manager/reports/manager-reports-panel";
import {
  navPageTimingBeacon,
  startNavPageTimer,
} from "@/lib/debug/start-nav-page-timer";

/** Light page (client panel only) — baseline for shared nav overhead. */
export default async function ManagerReportsPage() {
  const pageTimer = await startNavPageTimer("manager/reports");
  pageTimer.end();

  return (
    <>
      {await navPageTimingBeacon()}
      <ManagerReportsPanel />
    </>
  );
}
