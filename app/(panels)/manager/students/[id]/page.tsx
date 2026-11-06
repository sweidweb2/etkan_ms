import { notFound } from "next/navigation";
import { StudentActivityDeferred } from "@/components/manager/students/student-activity-deferred-section";
import { StudentDetailsPanel } from "@/components/manager/students/student-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentClassAcademicBundlesForManager } from "@/services/classes/student-course-grade.service";
import { getLinkedRegistrationApplicationIdForStudentManager } from "@/services/students/student-registration.service";
import {
  getStudentDetailStatsForManager,
  getStudentForManager,
  listJoinedClassesForStudentManager,
} from "@/services/students/student.service";

type ManagerStudentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerStudentDetailPage({
  params,
}: ManagerStudentDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const student = await getStudentForManager(adminClient, actorUserId, id);

  if (!student) {
    notFound();
  }

  // Start joined-classes immediately; chain academic bundles off that promise
  // so they overlap with the other independent loads.
  const joinedClassesPromise = listJoinedClassesForStudentManager(
    adminClient,
    actorUserId,
    student.user_id
  );
  const classBundlesPromise = joinedClassesPromise.then((joinedClasses) =>
    listStudentClassAcademicBundlesForManager(
      adminClient,
      actorUserId,
      student.user_id,
      joinedClasses
    )
  );

  const [stats, registrationApplicationId, classBundles] = await Promise.all([
    getStudentDetailStatsForManager(
      adminClient,
      actorUserId,
      student.user_id
    ),
    getLinkedRegistrationApplicationIdForStudentManager(
      adminClient,
      actorUserId,
      student.user_id
    ),
    classBundlesPromise,
  ]);

  return (
    <StudentDetailsPanel
      student={student}
      stats={stats}
      classBundles={classBundles}
      registrationApplicationId={registrationApplicationId}
      activitySection={
        <StudentActivityDeferred
          actorUserId={actorUserId}
          studentUserId={student.user_id}
        />
      }
    />
  );
}
