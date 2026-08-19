import {
  PublicFinancialForm,
  PublicFinancialFormStatus,
} from "@/components/public/public-financial-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInviteFormContextByToken } from "@/services/accounting/student-financial-adjustment.service";

export const dynamic = "force-dynamic";

type PublicFinancialFormPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicFinancialFormPage({
  params,
}: PublicFinancialFormPageProps) {
  const { token } = await params;
  const adminClient = createSupabaseAdminClient();
  const context = await getInviteFormContextByToken(adminClient, token);

  if (!context) {
    return <PublicFinancialFormStatus status="invalid" />;
  }

  if (context.is_used) {
    return <PublicFinancialFormStatus status="used" />;
  }

  return <PublicFinancialForm context={context} />;
}
