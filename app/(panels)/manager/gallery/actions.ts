"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidatePublicGallery } from "@/lib/cache/public-content-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateGalleryImageFormData } from "@/lib/validators/manager/create-gallery-image";
import { parseUpdateGalleryImageFormData } from "@/lib/validators/manager/update-gallery-image";
import {
  createGalleryImageForManager,
  createGalleryImagesBulkForManager,
  deleteGalleryImageForManager,
  updateGalleryImageForManager,
} from "@/services/public/gallery-image.service";
import type {
  BulkCreateGalleryImagesActionState,
  CreateGalleryImageActionState,
  DeleteGalleryImageActionState,
  UpdateGalleryImageActionState,
} from "@/types/manager-gallery-image";

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
  const result = await createGalleryImageForManager(
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

export async function createGalleryImagesBulkAction(
  _prevState: BulkCreateGalleryImagesActionState,
  formData: FormData
): Promise<BulkCreateGalleryImagesActionState> {
  const actor = await getSessionAuditActor();
  const rawJson = String(formData.get("records_json") ?? "");

  const adminClient = createSupabaseAdminClient();
  const result = await createGalleryImagesBulkForManager(
    adminClient,
    actor.userId,
    actor,
    rawJson
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
    images: result.images,
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
  const result = await updateGalleryImageForManager(
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
