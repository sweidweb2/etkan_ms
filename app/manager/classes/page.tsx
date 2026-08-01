import { ManageClassesPanel } from "@/components/manager/classes/manage-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listClassesForManager,
  listTeacherOptionsForManager,
} from "@/services/class.service";
import { listSemestersForManager } from "@/services/semester.service";
import { listStudentsWithoutInProgressClassForManager } from "@/services/student.service";
import { listSubjectsForManager } from "@/services/subject.service";

export default async function ManagerClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const [classes, subjects, semesters, teachers, studentsWithoutActiveClass] =
    await Promise.all([
      listClassesForManager(adminClient, actorUserId),
      listSubjectsForManager(adminClient, actorUserId),
      listSemestersForManager(adminClient, actorUserId),
      listTeacherOptionsForManager(adminClient, actorUserId),
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
      subjectOptions={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        nb_sessions: subject.nb_sessions,
      }))}
      semesterOptions={semesters.map((semester) => ({
        id: semester.id,
        name: semester.name,
      }))}
      teacherOptions={teachers}
    />
  );
}
