import { notFound } from "next/navigation";
import { StudentDetailsPanel } from "@/components/manager/students/student-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStudentForSelf } from "@/services/students/student.service";

export default async function StudentPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const student = await getStudentForSelf(adminClient, actorUserId);

  if (!student) {
    notFound();
  }

  return (
    <StudentDetailsPanel
      variant="self"
      student={student}
      classBundles={[]}
      registrationApplicationId={null}
    />
  );
}
