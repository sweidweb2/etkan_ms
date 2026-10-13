import { unstable_cache } from "next/cache";
import { loadPublicCachedData } from "@/lib/cache/load-public-cached-data";
import { PUBLIC_CONTENT_CACHE_TAGS } from "@/lib/cache/public-content-cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { optimizeGalleryImage } from "@/lib/manager/gallery/optimize-image";
import {
  buildGalleryImageStoragePath,
  getGalleryImageObjectPathFromPublicUrl,
} from "@/lib/manager/gallery/storage-path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createGalleryImageSchema } from "@/lib/validators/manager/create-gallery-image";
import { updateGalleryImageSchema } from "@/lib/validators/manager/update-gallery-image";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import type { GalleryImageRecord } from "@/repositories/gallery-image.repository";
import * as galleryStorageRepository from "@/repositories/gallery-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerGalleryImageRow } from "@/types/manager-gallery-image";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateGalleryImageSuccess = {
  success: true;
  image: ManagerGalleryImageRow;
  message: string;
};

export type CreateGalleryImageFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateGalleryImageResult =
  | CreateGalleryImageSuccess
  | CreateGalleryImageFailure;

export type UpdateGalleryImageSuccess = {
  success: true;
  image: ManagerGalleryImageRow;
  message: string;
};

export type UpdateGalleryImageFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateGalleryImageResult =
  | UpdateGalleryImageSuccess
  | UpdateGalleryImageFailure;

export type DeleteGalleryImageSuccess = {
  success: true;
  message: string;
};

export type DeleteGalleryImageFailure = {
  success: false;
  error: string;
};

export type DeleteGalleryImageResult =
  | DeleteGalleryImageSuccess
  | DeleteGalleryImageFailure;

function mapGalleryImageRecordToRow(
  record: GalleryImageRecord
): ManagerGalleryImageRow {
  return {
    id: record.id,
    name: record.name,
    direct_url: record.direct_url,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapCreateGalleryImageError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "An image with this URL already exists.";
  }

  return "Unable to create gallery image. Please try again.";
}

function mapUpdateGalleryImageError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "An image with this URL already exists.";
  }

  return "Unable to update gallery image. Please try again.";
}

async function uploadOptimizedGalleryImage(
  adminClient: Supabase,
  file: File
): Promise<
  | { success: true; publicUrl: string; storagePath: string }
  | { success: false; error: string }
> {
  const fileBytes = await file.arrayBuffer();
  const optimized = await optimizeGalleryImage({
    bytes: fileBytes,
    mimeType: file.type,
    originalFileName: file.name,
    byteLength: fileBytes.byteLength,
  });

  if (!optimized.success) {
    return { success: false, error: optimized.error };
  }

  const storagePath = buildGalleryImageStoragePath(optimized.fileName);
  const uploadResult = await galleryStorageRepository.uploadGalleryImage(
    adminClient,
    storagePath,
    new Uint8Array(optimized.buffer),
    optimized.contentType
  );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload image.",
    };
  }

  const publicUrl = galleryStorageRepository.getGalleryImagePublicUrl(
    adminClient,
    storagePath
  );

  if (!publicUrl) {
    await galleryStorageRepository.removeGalleryImages(adminClient, [
      storagePath,
    ]);
    return { success: false, error: "Unable to upload image." };
  }

  return { success: true, publicUrl, storagePath };
}

async function removeStoredGalleryImage(
  adminClient: Supabase,
  directUrl: string
): Promise<{ success: true } | { success: false; error: string }> {
  const objectPath = getGalleryImageObjectPathFromPublicUrl(directUrl);
  if (!objectPath) {
    return { success: true };
  }

  const result = await galleryStorageRepository.removeGalleryImages(
    adminClient,
    [objectPath]
  );

  if (result.error) {
    return {
      success: false,
      error: result.error.message || "Unable to delete gallery image file.",
    };
  }

  return { success: true };
}

const listGalleryImagesForPublicCached = unstable_cache(
  async () =>
    loadPublicCachedData([], async () => {
      const adminClient = createSupabaseAdminClient();
      const { data, error } =
        await galleryImageRepository.listGalleryImages(adminClient);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapGalleryImageRecordToRow);
    }),
  ["public-gallery-images"],
  { tags: [PUBLIC_CONTENT_CACHE_TAGS.GALLERY], revalidate: 3600 }
);

/**
 * Public gallery / about cover URLs. Shared Data Cache — no auth.
 * `adminClient` is kept for call-site compatibility; the cached path
 * creates its own admin client inside `unstable_cache`.
 */
export async function listGalleryImagesForPublic(
  _adminClient?: Supabase
): Promise<ManagerGalleryImageRow[]> {
  return listGalleryImagesForPublicCached();
}

export async function listGalleryImagesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerGalleryImageRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GALLERY_VIEW);

  const { data, error } =
    await galleryImageRepository.listGalleryImages(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapGalleryImageRecordToRow);
}

/**
 * Create a gallery row from an uploaded file (optimize → Storage → direct_url).
 */
export async function createGalleryImageFromUploadForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<CreateGalleryImageResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GALLERY_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createGalleryImageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const uploaded = await uploadOptimizedGalleryImage(
    adminClient,
    parsed.data.file
  );
  if (!uploaded.success) {
    return { success: false, error: uploaded.error };
  }

  const { data, error } = await galleryImageRepository.createGalleryImage(
    adminClient,
    {
      name: parsed.data.name,
      direct_url: uploaded.publicUrl,
    }
  );

  if (error || !data) {
    await galleryStorageRepository.removeGalleryImages(adminClient, [
      uploaded.storagePath,
    ]);
    return {
      success: false,
      error: mapCreateGalleryImageError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "gallery_images",
    record_id: data.id,
    new_data: {
      name: data.name,
      direct_url: data.direct_url,
    },
    metadata: { note: "Gallery image uploaded." },
  });

  return {
    success: true,
    image: mapGalleryImageRecordToRow(data),
    message: "Gallery image created.",
  };
}

/**
 * Update name and/or replace the stored image file.
 */
export async function updateGalleryImageFromUploadForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateGalleryImageResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GALLERY_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateGalleryImageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await galleryImageRepository.findGalleryImageById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update gallery image. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Gallery image not found." };
  }

  let nextDirectUrl = existing.data.direct_url;
  let uploadedStoragePath: string | null = null;

  if (parsed.data.file instanceof File) {
    const uploaded = await uploadOptimizedGalleryImage(
      adminClient,
      parsed.data.file
    );
    if (!uploaded.success) {
      return { success: false, error: uploaded.error };
    }
    nextDirectUrl = uploaded.publicUrl;
    uploadedStoragePath = uploaded.storagePath;
  }

  const { data, error } = await galleryImageRepository.updateGalleryImage(
    adminClient,
    parsed.data.id,
    {
      name: parsed.data.name,
      direct_url: nextDirectUrl,
    }
  );

  if (error || !data) {
    if (uploadedStoragePath) {
      await galleryStorageRepository.removeGalleryImages(adminClient, [
        uploadedStoragePath,
      ]);
    }
    return {
      success: false,
      error: mapUpdateGalleryImageError(error?.message ?? "Unknown error"),
    };
  }

  if (
    uploadedStoragePath &&
    existing.data.direct_url !== nextDirectUrl
  ) {
    const removed = await removeStoredGalleryImage(
      adminClient,
      existing.data.direct_url
    );
    if (!removed.success) {
      return {
        success: false,
        error:
          "The image was saved, but the previous file could not be removed from storage.",
      };
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "gallery_images",
    record_id: data.id,
    old_data: {
      name: existing.data.name,
      direct_url: existing.data.direct_url,
    },
    new_data: {
      name: data.name,
      direct_url: data.direct_url,
    },
    metadata: { note: "Gallery image updated." },
  });

  return {
    success: true,
    image: mapGalleryImageRecordToRow(data),
    message: "Gallery image updated.",
  };
}

export async function deleteGalleryImageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  imageId: string
): Promise<DeleteGalleryImageResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.GALLERY_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await galleryImageRepository.findGalleryImageById(
    adminClient,
    imageId
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to delete gallery image. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Gallery image not found." };
  }

  const removed = await removeStoredGalleryImage(
    adminClient,
    existing.data.direct_url
  );
  if (!removed.success) {
    return { success: false, error: removed.error };
  }

  const { error } = await galleryImageRepository.deleteGalleryImageById(
    adminClient,
    imageId
  );

  if (error) {
    return {
      success: false,
      error:
        "The image file was removed, but the gallery record could not be deleted.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "gallery_images",
    record_id: imageId,
    old_data: {
      name: existing.data.name,
      direct_url: existing.data.direct_url,
    },
    metadata: { note: "Gallery image deleted." },
  });

  return {
    success: true,
    message: "Gallery image deleted.",
  };
}
