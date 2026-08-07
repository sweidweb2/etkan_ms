import { redirect } from "next/navigation";
import { RequestTimingDebugPanel } from "@/components/debug/request-timing-debug-panel";
import { ManageInstructorsPanel } from "@/components/manager/instructors/manage-instructors-panel";
import { getSessionPack } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { timingAsync, timingMark } from "@/lib/debug/request-timing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInstructorsPageForManager } from "@/services/instructor.service";

export default async function ManagerInstructorsPage() {
  timingMark("instructorsPage:rsc:start");
  const adminClient = createSupabaseAdminClient();
  const pack = await timingAsync("instructorsPage:getSessionPack", () =>
    getSessionPack()
  );

  if (!pack.user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const data = await timingAsync("instructorsPage:getInstructorsPageForManager", () =>
    getInstructorsPageForManager(adminClient, pack.user!.id)
  );
  timingMark("instructorsPage:rsc:ready");

  return (
    <>
      <ManageInstructorsPanel data={data} />
      <RequestTimingDebugPanel title="Manage Instructors" />
    </>
  );
}
