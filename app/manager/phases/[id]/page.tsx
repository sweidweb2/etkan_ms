import { SemesterDetailsPanel } from "@/components/manager/phases/semester-details-panel";

type ManagerSemesterDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSemesterDetailPage({
  params,
}: ManagerSemesterDetailPageProps) {
  const { id } = await params;
  return <SemesterDetailsPanel semesterId={id} />;
}

