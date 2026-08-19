import { BorrowEquipmentPanel } from "@/components/manager/equipments/borrow-equipment-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getBorrowPageDataForManager } from "@/services/equipment/borrow-equipment.service";

export default async function ManagerBorrowEquipmentPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const pageData = await getBorrowPageDataForManager(adminClient, user?.id ?? null);

  return (
    <BorrowEquipmentPanel
      initialClasses={pageData.classes}
      initialBorrowHistory={pageData.borrowHistory}
      borrowHistoryTotalCount={pageData.borrowHistoryTotalCount}
    />
  );
}
