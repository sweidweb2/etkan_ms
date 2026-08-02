import { redirect } from "next/navigation";
import { IncomeStatementPanel } from "@/components/manager/accounting/income-statement-panel";
import {
  getSessionDisplayName,
  getSessionUser,
} from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getIncomeStatementForManager } from "@/services/income-statement.service";

export default async function ManagerIncomeStatementPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const [data, displayName] = await Promise.all([
    getIncomeStatementForManager(adminClient, user.id),
    getSessionDisplayName(),
  ]);

  return (
    <IncomeStatementPanel data={data} defaultRecordedBy={displayName} />
  );
}
