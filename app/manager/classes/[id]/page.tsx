import { ClassDetailsPanel } from "@/components/manager/classes/class-details-panel";

type ManagerClassDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassDetailPage({
  params,
}: ManagerClassDetailPageProps) {
  const { id } = await params;

  return <ClassDetailsPanel classId={id} />;
}
