import { ManageClassesPanel } from "@/components/manager/classes/manage-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listClassesForManager } from "@/services/classes/class.service";
import { listStudentsWithoutInProgressClassForManager } from "@/services/students/student.service";

export default async function ManagerClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [classes, studentsWithoutActiveClass] = await Promise.all([
    listClassesForManager(adminClient, actorUserId),
    listStudentsWithoutInProgressClassForManager(
      adminClient,
      actorUserId,
      PERMISSIONS.CLASSES_VIEW
    ),
  ]);

  return (
    <ManageClassesPanel
      initialClasses={classes}
      initialStudentsWithoutActiveClass={studentsWithoutActiveClass}
    />
  );
}
