import { ClassSessionDetailsPanel } from "@/components/manager/classes/class-session-details-panel";

type ManagerClassSessionDetailPageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

export default async function ManagerClassSessionDetailPage({
  params,
}: ManagerClassSessionDetailPageProps) {
  const { id, sessionId } = await params;

  return <ClassSessionDetailsPanel classId={id} sessionId={sessionId} />;
}
