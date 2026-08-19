import { ManageGalleryPanel } from "@/components/manager/gallery/manage-gallery-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listGalleryImagesForManager } from "@/services/public/gallery-image.service";

export default async function ManagerGalleryPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const images = await listGalleryImagesForManager(
    adminClient,
    user?.id ?? null
  );

  return <ManageGalleryPanel initialImages={images} />;
}
