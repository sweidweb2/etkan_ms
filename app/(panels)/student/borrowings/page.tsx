import { StudentBorrowedEquipmentSection } from "@/components/manager/students/student-borrowed-equipment-section";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentBorrowsForSelf } from "@/services/equipment/borrow-equipment.service";

export default async function StudentBorrowingsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const actorUserId = user?.id ?? null;

  const borrowRows = await listStudentBorrowsForSelf(
    adminClient,
    actorUserId
  );

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My borrowings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Equipment you have borrowed.
        </p>
      </div>
      <StudentBorrowedEquipmentSection
        initialBorrows={borrowRows}
        description="Your borrowed equipment, with status and dates."
        defaultOpen
        persistOpen={false}
      />
    </div>
  );
}
