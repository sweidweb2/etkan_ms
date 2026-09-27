import { unstable_cache } from "next/cache";
import { loadPublicCachedData } from "@/lib/cache/load-public-cached-data";
import { PUBLIC_CONTENT_CACHE_TAGS } from "@/lib/cache/public-content-cache";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL,
  type PublicProjectClassificationValue,
} from "@/lib/constants/manager-public-project";
import {
  buildProjectImageStoragePath,
  getProjectImageObjectPathFromPublicUrl,
} from "@/lib/manager/projects/storage-path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPublicProjectSchema } from "@/lib/validators/manager/create-public-project";
import { updatePublicProjectSchema } from "@/lib/validators/manager/update-public-project";
import * as publicProjectRepository from "@/repositories/public-project.repository";
import type { PublicProjectRecord } from "@/repositories/public-project.repository";
import * as publicProjectStorageRepository from "@/repositories/public-project-storage.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerPublicProjectRow } from "@/types/manager-public-project";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreatePublicProjectSuccess = {
  success: true;
  project: ManagerPublicProjectRow;
  message: string;
};

export type CreatePublicProjectFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreatePublicProjectResult =
  | CreatePublicProjectSuccess
  | CreatePublicProjectFailure;

export type UpdatePublicProjectSuccess = {
  success: true;
  project: ManagerPublicProjectRow;
  message: string;
};

export type UpdatePublicProjectFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdatePublicProjectResult =
  | UpdatePublicProjectSuccess
  | UpdatePublicProjectFailure;

export type DeletePublicProjectSuccess = {
  success: true;
  message: string;
};

export type DeletePublicProjectFailure = {
  success: false;
  error: string;
};

export type DeletePublicProjectResult =
  | DeletePublicProjectSuccess
  | DeletePublicProjectFailure;

function isProjectClassification(
  value: string
): value is PublicProjectClassificationValue {
  return value === "students" || value === "teachers" || value === "etkan";
}

function mapPublicProjectRecordToRow(
  record: PublicProjectRecord
): ManagerPublicProjectRow {
  if (!isProjectClassification(record.classification)) {
    throw new Error("Invalid public project record.");
  }

  return {
    id: record.id,
    classification: record.classification,
    category: record.category,
    title: record.title,
    body: record.body,
    author: record.author,
    image_url: record.image_url?.trim()
      ? record.image_url
      : PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL,
    href: record.href,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function auditPayload(record: PublicProjectRecord) {
  return {
    classification: record.classification,
    category: record.category,
    title: record.title,
    author: record.author,
    image_url: record.image_url,
    href: record.href,
  };
}

function mapCreatePublicProjectError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A project with this image already exists.";
  }

  return "Unable to create project. Please try again.";
}

function mapUpdatePublicProjectError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A project with this image already exists.";
  }

  return "Unable to update project. Please try again.";
}

async function uploadProjectImage(
  adminClient: Supabase,
  file: File
): Promise<
  | { success: true; publicUrl: string; storagePath: string }
  | { success: false; error: string }
> {
  const storagePath = buildProjectImageStoragePath(file.name);
  const contentType = file.type.trim();
  const fileBytes = await file.arrayBuffer();

  const uploadResult =
    await publicProjectStorageRepository.uploadPublicProjectImage(
      adminClient,
      storagePath,
      fileBytes,
      contentType
    );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload image.",
    };
  }

  const publicUrl = publicProjectStorageRepository.getPublicProjectImageUrl(
    adminClient,
    storagePath
  );

  if (!publicUrl) {
    await publicProjectStorageRepository.removePublicProjectImages(adminClient, [
      storagePath,
    ]);
    return { success: false, error: "Unable to upload image." };
  }

  return { success: true, publicUrl, storagePath };
}

async function removeStoredProjectImage(
  adminClient: Supabase,
  imageUrl: string
): Promise<{ success: true } | { success: false; error: string }> {
  const objectPath = getProjectImageObjectPathFromPublicUrl(imageUrl);
  if (!objectPath) {
    return { success: true };
  }

  const result = await publicProjectStorageRepository.removePublicProjectImages(
    adminClient,
    [objectPath]
  );

  if (result.error) {
    return {
      success: false,
      error: result.error.message || "Unable to delete project image.",
    };
  }

  return { success: true };
}

export async function listPublicProjectsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerPublicProjectRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.PROJECTS_VIEW);

  const { data, error } =
    await publicProjectRepository.listPublicProjects(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPublicProjectRecordToRow);
}

const listPublicProjectsForPublicCached = unstable_cache(
  async () =>
    loadPublicCachedData([], async () => {
      const adminClient = createSupabaseAdminClient();
      const { data, error } =
        await publicProjectRepository.listPublicProjects(adminClient);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(mapPublicProjectRecordToRow);
    }),
  ["public-projects-list"],
  { tags: [PUBLIC_CONTENT_CACHE_TAGS.PROJECTS], revalidate: 3600 }
);

/**
 * Public projects page. Shared Data Cache — no auth.
 * `adminClient` is kept for call-site compatibility; the cached path
 * creates its own admin client inside `unstable_cache`.
 */
export async function listPublicProjectsForPublic(
  _adminClient?: Supabase
): Promise<ManagerPublicProjectRow[]> {
  return listPublicProjectsForPublicCached();
}

export async function getPublicProjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  projectId: string
): Promise<ManagerPublicProjectRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.PROJECTS_VIEW);

  const { data, error } =
    await publicProjectRepository.findPublicProjectById(adminClient, projectId);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapPublicProjectRecordToRow(data);
}

export async function createPublicProjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<CreatePublicProjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.PROJECTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createPublicProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let imageUrl = PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL;
  let uploadedStoragePath: string | null = null;

  if (parsed.data.image) {
    const uploaded = await uploadProjectImage(adminClient, parsed.data.image);
    if (!uploaded.success) {
      return { success: false, error: uploaded.error };
    }
    imageUrl = uploaded.publicUrl;
    uploadedStoragePath = uploaded.storagePath;
  }

  const { data, error } = await publicProjectRepository.createPublicProject(
    adminClient,
    {
      classification: parsed.data.classification,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      author: parsed.data.author,
      image_url: imageUrl,
      href: parsed.data.href,
    }
  );

  if (error || !data) {
    if (uploadedStoragePath) {
      await publicProjectStorageRepository.removePublicProjectImages(
        adminClient,
        [uploadedStoragePath]
      );
    }
    return {
      success: false,
      error: mapCreatePublicProjectError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "public_projects",
    record_id: data.id,
    new_data: auditPayload(data),
    metadata: { note: "Public project created." },
  });

  return {
    success: true,
    project: mapPublicProjectRecordToRow(data),
    message: "Project created.",
  };
}

export async function updatePublicProjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdatePublicProjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.PROJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updatePublicProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await publicProjectRepository.findPublicProjectById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update project. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Project not found." };
  }

  let imageUrl = existing.data.image_url;
  let uploadedStoragePath: string | null = null;

  if (parsed.data.image) {
    const uploaded = await uploadProjectImage(adminClient, parsed.data.image);
    if (!uploaded.success) {
      return { success: false, error: uploaded.error };
    }
    imageUrl = uploaded.publicUrl;
    uploadedStoragePath = uploaded.storagePath;
  }

  const { data, error } = await publicProjectRepository.updatePublicProject(
    adminClient,
    parsed.data.id,
    {
      classification: parsed.data.classification,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      author: parsed.data.author,
      image_url: imageUrl,
      href: parsed.data.href,
    }
  );

  if (error || !data) {
    if (uploadedStoragePath) {
      await publicProjectStorageRepository.removePublicProjectImages(
        adminClient,
        [uploadedStoragePath]
      );
    }
    return {
      success: false,
      error: mapUpdatePublicProjectError(error?.message ?? "Unknown error"),
    };
  }

  if (uploadedStoragePath && existing.data.image_url !== imageUrl) {
    await removeStoredProjectImage(adminClient, existing.data.image_url);
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "public_projects",
    record_id: data.id,
    old_data: auditPayload(existing.data),
    new_data: auditPayload(data),
    metadata: { note: "Public project updated." },
  });

  return {
    success: true,
    project: mapPublicProjectRecordToRow(data),
    message: "Project updated.",
  };
}

export async function deletePublicProjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  projectId: string
): Promise<DeletePublicProjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.PROJECTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await publicProjectRepository.findPublicProjectById(
    adminClient,
    projectId
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to delete project. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Project not found." };
  }

  const removedImage = await removeStoredProjectImage(
    adminClient,
    existing.data.image_url
  );

  if (!removedImage.success) {
    return {
      success: false,
      error: "Unable to delete the project image. Please try again.",
    };
  }

  const { error } = await publicProjectRepository.deletePublicProjectById(
    adminClient,
    projectId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete project. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "public_projects",
    record_id: projectId,
    old_data: auditPayload(existing.data),
    metadata: { note: "Public project deleted." },
  });

  return {
    success: true,
    message: "Project deleted.",
  };
}
