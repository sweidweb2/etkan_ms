import { redirect } from "next/navigation";
import { InstructorScheduleSlotsDetailsPanel } from "@/components/manager/instructor-schedules/instructor-schedule-slots-details-panel";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getInstructorScheduleSlotsDetailsForManager } from "@/services/schedule/instructor-schedule-slot.service";

type ManagerInstructorScheduleSlotsDetailsPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    entityType?: string;
    type?: string;
    q?: string;
  }>;
};

export default async function ManagerInstructorScheduleSlotsDetailsPage({
  searchParams,
}: ManagerInstructorScheduleSlotsDetailsPageProps) {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (!user?.id) {
    redirect(ROUTES.LOGIN);
  }

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;

  const data = await getInstructorScheduleSlotsDetailsForManager(
    adminClient,
    user.id,
    {
      page,
      pageSize,
      entityType: params.entityType,
      type: params.type,
      search: params.q,
    }
  );

  return <InstructorScheduleSlotsDetailsPanel data={data} />;
}
