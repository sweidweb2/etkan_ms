import { notFound } from "next/navigation";
import { RegistrationDetailsPanel } from "@/components/manager/registrations/registration-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { parseRegistrationDetailFrom } from "@/lib/constants/registration-detail-from";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRegistrationApplicationDetailPageForManager } from "@/services/students/student-registration.service";

type ManagerRegistrationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function ManagerRegistrationDetailPage({
  params,
  searchParams,
}: ManagerRegistrationDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const from = parseRegistrationDetailFrom(query.from);
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const detail = await getRegistrationApplicationDetailPageForManager(
    adminClient,
    user?.id ?? null,
    id,
    from
  );

  if (!detail) {
    notFound();
  }

  return (
    <RegistrationDetailsPanel
      application={detail.application}
      signedDocuments={detail.signedDocuments}
      breadcrumbItems={detail.breadcrumbItems}
    />
  );
}
