import { ManageClassesPanel } from "@/components/manager/classes/manage-classes-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listClassesForManager,
  listTeacherOptionsForManager,
} from "@/services/class.service";
import { listSemestersForManager } from "@/services/semester.service";
import { listSubjectsForManager } from "@/services/subject.service";

export default async function ManagerClassesPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  const [classes, subjects, semesters, teachers] = await Promise.all([
    listClassesForManager(adminClient, user?.id ?? null),
    listSubjectsForManager(adminClient, user?.id ?? null),
    listSemestersForManager(adminClient, user?.id ?? null),
    listTeacherOptionsForManager(adminClient, user?.id ?? null),
  ]);

  return (
    <ManageClassesPanel
      initialClasses={classes}
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
