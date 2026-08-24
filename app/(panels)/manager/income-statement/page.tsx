import { redirect } from "next/navigation";
import { IncomeStatementPanel } from "@/components/manager/accounting/income-statement-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getIncomeStatementForManager,
  incomeStatementPeriodLabel,
} from "@/services/accounting/income-statement.service";

export default async function ManagerIncomeStatementPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const now = new Date();
  const period = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  const data = await getIncomeStatementForManager(
    adminClient,
    user.id,
    period,
    now
  );

  return (
    <IncomeStatementPanel
      data={data}
      periodLabel={incomeStatementPeriodLabel(period)}
    />
  );
}
