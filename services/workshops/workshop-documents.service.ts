import { PERMISSIONS } from "@/lib/constants/permissions";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  deleteWorkshopDocumentSchema,
  renameWorkshopDocumentSchema,
  uploadWorkshopDocumentSchema,
} from "@/lib/validators/manager/workshop-document";
import { buildWorkshopDocumentStoragePath } from "@/lib/manager/workshops/storage-path";
import * as workshopDocumentRepository from "@/repositories/workshop-document.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopStorageRepository from "@/repositories/workshop-storage.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  contentLockErrorForWorkshopStatus,
  mapWorkshopDocumentRecord,
  type DeleteWorkshopDocumentResult,
  type Supabase,
  type WorkshopDocumentMutationResult,
} from "@/services/workshops/workshop-shared";

export async function uploadWorkshopDocumentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopDocumentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = uploadWorkshopDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    dataInput.workshop_id
  );

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to upload document.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const storagePath = buildWorkshopDocumentStoragePath(
    dataInput.workshop_id,
    dataInput.file.name
  );
  const contentType = dataInput.file.type.trim();
  const fileBytes = await dataInput.file.arrayBuffer();

  const uploadResult =
    await workshopStorageRepository.uploadWorkshopStorageObject(
      adminClient,
      storagePath,
      fileBytes,
      contentType
    );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload document.",
    };
  }

  const { data, error } =
    await workshopDocumentRepository.createWorkshopDocument(adminClient, {
      workshop_id: dataInput.workshop_id,
      name: dataInput.name,
      storage_path: storagePath,
      file_size: dataInput.file.size,
      mime_type: contentType,
      uploaded_by: actorUserId,
    });

  if (error || !data) {
    await workshopStorageRepository.removeWorkshopStorageObjects(adminClient, [
      storagePath,
    ]);
    return {
      success: false,
      error: error?.message || "Unable to save document.",
    };
  }

  const document = mapWorkshopDocumentRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_documents",
    record_id: document.id,
    new_data: {
      workshop_id: document.workshop_id,
      name: document.name,
      storage_path: document.storage_path,
      file_size: document.file_size,
      mime_type: document.mime_type,
    },
    metadata: { note: "Workshop document uploaded." },
  });

  return {
    success: true,
    document,
    message: "Document uploaded.",
  };
}

export async function renameWorkshopDocumentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopDocumentMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DOCUMENTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = renameWorkshopDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopDocumentRepository.findWorkshopDocumentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to rename document.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Document not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Document not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to rename document.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previousName = existing.data.name;

  const { data, error } =
    await workshopDocumentRepository.updateWorkshopDocumentNameById(
      adminClient,
      dataInput.id,
      dataInput.name
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to rename document.",
    };
  }

  const document = mapWorkshopDocumentRecord(data);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_documents",
    record_id: document.id,
    old_data: { name: previousName },
    new_data: { name: document.name },
    metadata: { note: "Workshop document renamed." },
  });

  return {
    success: true,
    document,
    message: "Document renamed.",
  };
}

export async function deleteWorkshopDocumentForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteWorkshopDocumentResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_DOCUMENTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = deleteWorkshopDocumentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing = await workshopDocumentRepository.findWorkshopDocumentById(
    adminClient,
    dataInput.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete document.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Document not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Document not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to delete document.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const storageResult =
    await workshopStorageRepository.removeWorkshopStorageObjects(adminClient, [
      existing.data.storage_path,
    ]);

  if (storageResult.error) {
    return {
      success: false,
      error: storageResult.error.message || "Unable to delete document file.",
    };
  }

  const { error } = await workshopDocumentRepository.deleteWorkshopDocumentById(
    adminClient,
    dataInput.id
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete document.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_documents",
    record_id: dataInput.id,
    old_data: {
      workshop_id: existing.data.workshop_id,
      name: existing.data.name,
      storage_path: existing.data.storage_path,
      file_size: existing.data.file_size,
      mime_type: existing.data.mime_type,
    },
    metadata: { note: "Workshop document deleted." },
  });

  return {
    success: true,
    message: "Document deleted.",
  };
}
