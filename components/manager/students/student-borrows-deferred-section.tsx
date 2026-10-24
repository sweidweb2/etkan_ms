import { Suspense } from "react";
import { StudentBorrowedEquipmentSection } from "@/components/manager/students/student-borrowed-equipment-section";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listStudentBorrowsForManager } from "@/services/equipment/borrow-equipment.service";

type StudentBorrowsDeferredSectionProps = {
  actorUserId: string | null;
  studentUserId: string;
};

async function StudentBorrowsDeferredSection({
  actorUserId,
  studentUserId,
}: StudentBorrowsDeferredSectionProps) {
  const adminClient = createSupabaseAdminClient();
  const rows = await listStudentBorrowsForManager(
    adminClient,
    actorUserId,
    studentUserId
  );

  return <StudentBorrowedEquipmentSection initialBorrows={rows} />;
}

function StudentBorrowsDeferredFallback() {
  return (
    <div
      className="min-h-[10rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
      aria-hidden
    />
  );
}

export function StudentBorrowsDeferred({
  actorUserId,
  studentUserId,
}: StudentBorrowsDeferredSectionProps) {
  return (
    <Suspense fallback={<StudentBorrowsDeferredFallback />}>
      <StudentBorrowsDeferredSection
        actorUserId={actorUserId}
        studentUserId={studentUserId}
      />
    </Suspense>
  );
}
