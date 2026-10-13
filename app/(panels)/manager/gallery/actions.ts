"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidatePublicGallery } from "@/lib/cache/public-content-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateGalleryImageFormData } from "@/lib/validators/manager/create-gallery-image";
import { parseUpdateGalleryImageFormData } from "@/lib/validators/manager/update-gallery-image";
import {
  createGalleryImageFromUploadForManager,
  deleteGalleryImageForManager,
  listGalleryImagesForManager,
  updateGalleryImageFromUploadForManager,
} from "@/services/gallery/gallery-image.service";
import type {
  CreateGalleryImageActionState,
  DeleteGalleryImageActionState,
  ManagerGalleryListQuery,
  UpdateGalleryImageActionState,
} from "@/types/manager-gallery-image";

export async function loadGalleryImagesPageAction(
  query: ManagerGalleryListQuery
) {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  try {
    const data = await listGalleryImagesForManager(
      adminClient,
      actor.userId,
      query
    );
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load gallery images.",
    };
  }
}

export async function createGalleryImageAction(
  _prevState: CreateGalleryImageActionState,
  formData: FormData
): Promise<CreateGalleryImageActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateGalleryImageFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createGalleryImageFromUploadForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePublicGallery();

  return {
    success: true,
    message: result.message,
    image: result.image,
  };
}

export async function updateGalleryImageAction(
  _prevState: UpdateGalleryImageActionState,
  formData: FormData
): Promise<UpdateGalleryImageActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateGalleryImageFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateGalleryImageFromUploadForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePublicGallery();

  return {
    success: true,
    message: result.message,
    image: result.image,
  };
}

export async function deleteGalleryImageAction(
  _prevState: DeleteGalleryImageActionState,
  formData: FormData
): Promise<DeleteGalleryImageActionState> {
  const actor = await getSessionAuditActor();
  const imageId = String(formData.get("id") ?? "").trim();

  if (!imageId) {
    return {
      success: false,
      error: "Gallery image not found.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteGalleryImageForManager(
    adminClient,
    actor.userId,
    actor,
    imageId
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePublicGallery();

  return {
    success: true,
    message: result.message,
  };
}
