import { PERMISSIONS } from "@/lib/constants/permissions";
import { createGalleryImageSchema } from "@/lib/validators/manager/create-gallery-image";
import { updateGalleryImageSchema } from "@/lib/validators/manager/update-gallery-image";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import type { GalleryImageRecord } from "@/repositories/gallery-image.repository";
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

export async function listGalleryImagesForPublic(
  adminClient: Supabase
): Promise<ManagerGalleryImageRow[]> {
  const { data, error } =
    await galleryImageRepository.listGalleryImages(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapGalleryImageRecordToRow);
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

export async function createGalleryImageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { name: string; direct_url: string }
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

  const { name, direct_url } = parsed.data;

  const { data, error } = await galleryImageRepository.createGalleryImage(
    adminClient,
    {
      name: name.trim(),
      direct_url: direct_url.trim(),
    }
  );

  if (error || !data) {
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
    metadata: { note: "Gallery image created." },
  });

  return {
    success: true,
    image: mapGalleryImageRecordToRow(data),
    message: "Gallery image created.",
  };
}

export async function updateGalleryImageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; name: string; direct_url: string }
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

  const { name, direct_url } = parsed.data;

  const { data, error } = await galleryImageRepository.updateGalleryImage(
    adminClient,
    parsed.data.id,
    {
      name: name.trim(),
      direct_url: direct_url.trim(),
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateGalleryImageError(error?.message ?? "Unknown error"),
    };
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

  const { error } = await galleryImageRepository.deleteGalleryImageById(
    adminClient,
    imageId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete gallery image. Please try again.",
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
