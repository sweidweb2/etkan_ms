import { redirect } from "next/navigation";
import { getManagerClassTaskDetailRoute } from "@/lib/constants/routes";

type LegacyManagerClassSessionTaskDetailPageProps = {
  params: Promise<{ id: string; sessionId: string; taskId: string }>;
};

/** Session-scoped task URLs moved to `/manager/classes/[id]/tasks/[taskId]`. */
export default async function LegacyManagerClassSessionTaskDetailPage({
  params,
}: LegacyManagerClassSessionTaskDetailPageProps) {
  const { id, taskId } = await params;
  redirect(getManagerClassTaskDetailRoute(id, taskId));
}
