import { SubjectDetailsPanel } from "@/components/manager/subjects/subject-details-panel";

type ManagerSubjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSubjectDetailPage({
  params,
}: ManagerSubjectDetailPageProps) {
  const { id } = await params;

  return <SubjectDetailsPanel subjectId={id} />;
}
