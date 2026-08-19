import { notFound } from "next/navigation";
import { SemesterDetailsPanel } from "@/components/manager/phases/semester-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSemesterForManager,
  listSemesterClassesForManager,
  listUnlinkedClassesForManager,
} from "@/services/classes/semester.service";
import {
  listAvailableStudentsForSemester,
  listSemesterStudentsForManager,
} from "@/services/students/student-semester.service";

type ManagerSemesterDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSemesterDetailPage({
  params,
}: ManagerSemesterDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const semester = await getSemesterForManager(adminClient, user?.id ?? null, id);

  if (!semester) {
    notFound();
  }

  const [students, availableStudents, classes, availableClasses] =
    await Promise.all([
      listSemesterStudentsForManager(adminClient, user?.id ?? null, id, semester.name),
      listAvailableStudentsForSemester(adminClient, user?.id ?? null, id),
      listSemesterClassesForManager(adminClient, user?.id ?? null, id),
      listUnlinkedClassesForManager(adminClient, user?.id ?? null),
    ]);

  return (
    <SemesterDetailsPanel
      semester={semester}
      initialStudents={students}
      initialAvailableStudents={availableStudents}
      initialClasses={classes}
      initialAvailableClasses={availableClasses}
    />
  );
}
