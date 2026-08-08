import { notFound } from "next/navigation";
import { RegistrationDetailsPanel } from "@/components/manager/registrations/registration-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRegistrationApplicationDetailForManager } from "@/services/student-registration.service";

type ManagerRegistrationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerRegistrationDetailPage({
  params,
}: ManagerRegistrationDetailPageProps) {
  const { id } = await params;
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const detail = await getRegistrationApplicationDetailForManager(
    adminClient,
    user?.id ?? null,
    id
  );

  if (!detail) {
    notFound();
  }

  return (
    <RegistrationDetailsPanel
      application={detail.application}
      signedDocuments={detail.signedDocuments}
    />
  );
}
