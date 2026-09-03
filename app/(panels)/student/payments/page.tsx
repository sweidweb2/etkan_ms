import { StudentOpenPaymentsPanel } from "@/components/student/accounting/student-open-payments-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listOpenSppsForSelf } from "@/services/accounting/student-payment.service";

export default async function StudentPaymentsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const rows = await listOpenSppsForSelf(adminClient, actorUserId);

  return <StudentOpenPaymentsPanel rows={rows} />;
}
