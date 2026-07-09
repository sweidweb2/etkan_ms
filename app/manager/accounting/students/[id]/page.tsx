import { StudentAccountDetailsPanel } from "@/components/manager/accounting/student-account-details-panel";

type ManagerStudentAccountDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerStudentAccountDetailPage({
  params,
}: ManagerStudentAccountDetailPageProps) {
  const { id } = await params;

  return <StudentAccountDetailsPanel studentProfileId={id} />;
}
