import { notFound } from "next/navigation";
import { SentEmailDetailsPanel } from "@/components/manager/emailing/sent-email-details-panel";
import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSentEmailDetailForManager } from "@/services/email.service";

type ManagerSentEmailDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerSentEmailDetailPage({
  params,
}: ManagerSentEmailDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const role = await getSessionRole();
  const detail = await getSentEmailDetailForManager(adminClient, role, id);

  if (!detail) {
    notFound();
  }

  return (
    <SentEmailDetailsPanel
      email={detail.email}
      recipients={detail.recipients}
    />
  );
}
