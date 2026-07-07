import { StudentDetailsPanel } from "@/components/manager/students/student-details-panel";

type ManagerStudentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerStudentDetailPage({
  params,
}: ManagerStudentDetailPageProps) {
  const { id } = await params;

  return <StudentDetailsPanel studentProfileId={id} />;
}
