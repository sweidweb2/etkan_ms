import { getGalleryImagePublicUrl } from "@/lib/manager/gallery/storage-path";
import type { GalleryImageRecord } from "@/repositories/gallery-image.repository";
import type { ManagerGalleryImageRow } from "@/types/manager-gallery-image";

export function mapGalleryImageRecordToRow(
  record: GalleryImageRecord
): ManagerGalleryImageRow {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return {
    id: record.id,
    name: record.name,
    storagePath: record.storage_path,
    url: supabaseUrl
      ? getGalleryImagePublicUrl(supabaseUrl, record.storage_path)
      : "",
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}
