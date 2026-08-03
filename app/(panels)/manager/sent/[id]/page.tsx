import { notFound } from "next/navigation";
import { SentEmailDetailsPanel } from "@/components/manager/emailing/sent-email-details-panel";
import { getSessionUser } from "@/lib/auth/session";
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
  const user = await getSessionUser();
  const detail = await getSentEmailDetailForManager(adminClient, user?.id ?? null, id);

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
