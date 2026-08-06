"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateGalleryImageFormData } from "@/lib/validators/manager/create-gallery-image";
import { parseUpdateGalleryImageFormData } from "@/lib/validators/manager/update-gallery-image";
import {
  createGalleryImageForManager,
  deleteGalleryImageForManager,
  updateGalleryImageForManager,
} from "@/services/gallery-image.service";
import type {
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

  return {
    success: true,
    message: result.message,
  };
}
