import "server-only";

import { unstable_cache } from "next/cache";
import { loadPublicCachedData } from "@/lib/cache/load-public-cached-data";
import { PUBLIC_CONTENT_CACHE_TAGS } from "@/lib/cache/public-content-cache";
import { PUBLIC_GALLERY_LIMIT } from "@/lib/constants/manager-gallery";
import { mapGalleryImageRecordToRow } from "@/lib/manager/gallery/map-gallery-image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import type { ManagerGalleryImageRow } from "@/types/manager-gallery-image";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const listGalleryImagesForPublicCached = unstable_cache(
  async () =>
    loadPublicCachedData([], async () => {
      const adminClient = createSupabaseAdminClient();
      const { data, error } =
        await galleryImageRepository.listPublicGalleryImages(
          adminClient,
          PUBLIC_GALLERY_LIMIT
        );

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapGalleryImageRecordToRow);
    }),
  ["public-gallery-images"],
  { tags: [PUBLIC_CONTENT_CACHE_TAGS.GALLERY], revalidate: 3600 }
);

/**
 * Newest gallery images for the public marquee and about page.
 * Capped at PUBLIC_GALLERY_LIMIT. The manager list reaches the rest.
 */
export async function listGalleryImagesForPublic(
  _adminClient?: Supabase
): Promise<ManagerGalleryImageRow[]> {
  return listGalleryImagesForPublicCached();
}
