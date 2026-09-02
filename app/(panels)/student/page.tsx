import { notFound } from "next/navigation";
import { StudentDetailsPanel } from "@/components/manager/students/student-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentClassAcademicBundlesForSelf } from "@/services/classes/student-course-grade.service";
import { listStudentBorrowsForSelf } from "@/services/equipment/borrow-equipment.service";
import {
  getStudentDetailStatsForSelf,
  getStudentForSelf,
  listJoinedClassesForStudentSelf,
} from "@/services/students/student.service";

export default async function StudentPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const student = await getStudentForSelf(adminClient, actorUserId);

  if (!student) {
    notFound();
  }

  const [stats, joinedClasses, borrowRows] = await Promise.all([
    getStudentDetailStatsForSelf(adminClient, actorUserId),
    listJoinedClassesForStudentSelf(adminClient, actorUserId),
    listStudentBorrowsForSelf(adminClient, actorUserId),
  ]);

  const classBundles = await listStudentClassAcademicBundlesForSelf(
    adminClient,
    actorUserId,
    joinedClasses
  );

  return (
    <StudentDetailsPanel
      variant="self"
      student={student}
      stats={stats}
      availableClasses={[]}
      classBundles={classBundles}
      activityRows={[]}
      registrationApplicationId={null}
      borrowRows={borrowRows}
    />
  );
}
