import { ManageGalleryPanel } from "@/components/manager/gallery/manage-gallery-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { GALLERY_MANAGER_PAGE_SIZE } from "@/lib/constants/manager-gallery";
import { listGalleryImagesForManager } from "@/services/gallery/gallery-image.service";

export default async function ManagerGalleryPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const initialData = await listGalleryImagesForManager(
    adminClient,
    user?.id ?? null,
    { page: 1, pageSize: GALLERY_MANAGER_PAGE_SIZE, search: "" }
  );

  return <ManageGalleryPanel initialData={initialData} />;
}
