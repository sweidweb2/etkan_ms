import {
  GALLERY_MANAGER_PAGE_SIZE,
  GALLERY_MANAGER_PAGE_SIZE_OPTIONS,
} from "@/lib/constants/manager-gallery";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { optimizeGalleryImage } from "@/lib/manager/gallery/optimize-image";
import { mapGalleryImageRecordToRow } from "@/lib/manager/gallery/map-gallery-image";
import {
  buildGalleryImageStoragePath,
  splitGalleryImageStoragePath,
} from "@/lib/manager/gallery/storage-path";
import { createGalleryImageSchema } from "@/lib/validators/manager/create-gallery-image";
import { updateGalleryImageSchema } from "@/lib/validators/manager/update-gallery-image";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import {
  removeObjects,
  uploadObject,
} from "@/repositories/object-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerGalleryImageRow,
  ManagerGalleryListData,
  ManagerGalleryListQuery,
} from "@/types/manager-gallery-image";
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

const PAGE_SIZES = new Set<number>(GALLERY_MANAGER_PAGE_SIZE_OPTIONS);

function mapCreateGalleryImageError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "An image with this file already exists.";
  }

  return "Unable to create gallery image. Please try again.";
}

function mapUpdateGalleryImageError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "An image with this file already exists.";
  }

  return "Unable to update gallery image. Please try again.";
}

async function uploadGalleryFile(
  adminClient: Supabase,
  file: File
): Promise<
  { success: true; storagePath: string } | { success: false; error: string }
> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeGalleryImage({
    bytes,
    originalFileName: file.name,
    byteLength: file.size,
  });

  if (!optimized.success) {
    return { success: false, error: optimized.error };
  }

  const storagePath = buildGalleryImageStoragePath(optimized.fileName);
  const { bucket, objectPath } = splitGalleryImageStoragePath(storagePath);
  const uploadResult = await uploadObject(
    adminClient,
    bucket,
    objectPath,
    optimized.buffer,
    optimized.contentType
  );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload image.",
    };
  }

  return { success: true, storagePath };
}

async function removeGalleryObject(
  adminClient: Supabase,
  storagePath: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { bucket, objectPath } = splitGalleryImageStoragePath(storagePath);
  const result = await removeObjects(adminClient, bucket, [objectPath]);

  if (result.error) {
    return {
      success: false,
      error: result.error.message || "Unable to delete gallery image file.",
    };
  }

  return { success: true };
}

function normalizeListQuery(query: ManagerGalleryListQuery) {
  const requestedSize = query.pageSize ?? GALLERY_MANAGER_PAGE_SIZE;
  const pageSize = PAGE_SIZES.has(requestedSize)
    ? requestedSize
    : GALLERY_MANAGER_PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const search = (query.search ?? "").trim().slice(0, 200);
  return { page, pageSize, search };
}

export async function listGalleryImagesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerGalleryListQuery = {}
): Promise<ManagerGalleryListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GALLERY_VIEW);

  const normalized = normalizeListQuery(query);
  let { page } = normalized;
  const { pageSize, search } = normalized;

  let listed = await galleryImageRepository.listGalleryImagesPage(adminClient, {
    page,
    pageSize,
    search,
  });

  if (listed.error) {
    throw new Error(listed.error.message);
  }

  const totalCount = listed.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (page > totalPages) {
    page = totalPages;
    listed = await galleryImageRepository.listGalleryImagesPage(adminClient, {
      page,
      pageSize,
      search,
    });
    if (listed.error) {
      throw new Error(listed.error.message);
    }
  }

  let catalogCount = totalCount;
  if (search) {
    const catalog = await galleryImageRepository.countGalleryImages(adminClient);
    if (catalog.error) {
      throw new Error(catalog.error.message);
    }
    catalogCount = catalog.count ?? 0;
  }

  return {
    images: (listed.data ?? []).map(mapGalleryImageRecordToRow),
    totalCount,
    catalogCount,
    page,
    pageSize,
  };
}

/**
 * Upload the original file, then insert the gallery row.
 * If the insert fails, the new object is removed.
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

  const uploaded = await uploadGalleryFile(adminClient, parsed.data.file);
  if (!uploaded.success) {
    return { success: false, error: uploaded.error };
  }

  const { data, error } = await galleryImageRepository.createGalleryImage(
    adminClient,
    {
      name: parsed.data.name,
      storage_path: uploaded.storagePath,
    }
  );

  if (error || !data) {
    await removeGalleryObject(adminClient, uploaded.storagePath);
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
      storage_path: data.storage_path,
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
 * Replace uploads the new object, updates the row, then removes the old object.
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

  let nextStoragePath = existing.data.storage_path;
  let uploadedStoragePath: string | null = null;

  if (parsed.data.file instanceof File) {
    const uploaded = await uploadGalleryFile(adminClient, parsed.data.file);
    if (!uploaded.success) {
      return { success: false, error: uploaded.error };
    }
    nextStoragePath = uploaded.storagePath;
    uploadedStoragePath = uploaded.storagePath;
  }

  const { data, error } = await galleryImageRepository.updateGalleryImage(
    adminClient,
    parsed.data.id,
    {
      name: parsed.data.name,
      storage_path: nextStoragePath,
    }
  );

  if (error || !data) {
    if (uploadedStoragePath) {
      await removeGalleryObject(adminClient, uploadedStoragePath);
    }
    return {
      success: false,
      error: mapUpdateGalleryImageError(error?.message ?? "Unknown error"),
    };
  }

  if (uploadedStoragePath && existing.data.storage_path !== nextStoragePath) {
    const removed = await removeGalleryObject(
      adminClient,
      existing.data.storage_path
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
      storage_path: existing.data.storage_path,
    },
    new_data: {
      name: data.name,
      storage_path: data.storage_path,
    },
    metadata: { note: "Gallery image updated." },
  });

  return {
    success: true,
    image: mapGalleryImageRecordToRow(data),
    message: "Gallery image updated.",
  };
}

/**
 * Removes the storage object first. A failed remove keeps the row.
 */
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

  const removed = await removeGalleryObject(
    adminClient,
    existing.data.storage_path
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
      storage_path: existing.data.storage_path,
    },
    metadata: { note: "Gallery image deleted." },
  });

  return {
    success: true,
    message: "Gallery image deleted.",
  };
}
