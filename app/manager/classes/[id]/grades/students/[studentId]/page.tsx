import { StudentClassGradeDetailsPanel } from "@/components/manager/classes/student-class-grade-details-panel";

type ManagerClassStudentGradesDetailPageProps = {
  params: Promise<{ id: string; studentId: string }>;
};

export default async function ManagerClassStudentGradesDetailPage({
  params,
}: ManagerClassStudentGradesDetailPageProps) {
  const { id, studentId } = await params;

  return <StudentClassGradeDetailsPanel classId={id} studentId={studentId} />;
}
