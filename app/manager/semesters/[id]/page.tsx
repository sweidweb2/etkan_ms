import { notFound } from "next/navigation";
import { SemesterDetailsPanel } from "@/components/manager/phases/semester-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSemesterForManager,
  listSemesterClassesForManager,
  listUnlinkedClassesForManager,
} from "@/services/semester.service";
import {
  listAvailableStudentsForSemester,
  listSemesterStudentsForManager,
} from "@/services/student-semester.service";

type ManagerSemesterDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSemesterDetailPage({
  params,
}: ManagerSemesterDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const semester = await getSemesterForManager(adminClient, role, id);

  if (!semester) {
    notFound();
  }

  const [students, availableStudents, classes, availableClasses] =
    await Promise.all([
      listSemesterStudentsForManager(adminClient, role, id, semester.name),
      listAvailableStudentsForSemester(adminClient, role, id),
      listSemesterClassesForManager(adminClient, role, id),
      listUnlinkedClassesForManager(adminClient, role),
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
