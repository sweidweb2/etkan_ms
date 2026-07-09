import { notFound } from "next/navigation";
import { StudentDetailsPanel } from "@/components/manager/students/student-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStudentDetailStatsForManager,
  getStudentForManager,
} from "@/services/student.service";

type ManagerStudentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerStudentDetailPage({
  params,
}: ManagerStudentDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();

  const student = await getStudentForManager(adminClient, role, id);

  if (!student) {
    notFound();
  }

  const stats = await getStudentDetailStatsForManager(
    adminClient,
    role,
    student.user_id
  );

  return <StudentDetailsPanel student={student} stats={stats} />;
}
