import { GallerySection } from "@/components/public/gallery-section";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { shuffleArray } from "@/lib/utils/shuffle-array";
import { listGalleryImagesForPublic } from "@/services/public/gallery-image.service";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const adminClient = createSupabaseAdminClient();
  const images = await listGalleryImagesForPublic(adminClient);

  return <GallerySection images={shuffleArray(images)} />;
}
