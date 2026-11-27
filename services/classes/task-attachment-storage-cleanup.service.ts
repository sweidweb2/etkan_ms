import "server-only";

import type { TaskAttachmentEntity } from "@/lib/constants/task-attachments";
import * as taskAttachmentRepository from "@/repositories/task-attachment.repository";
import * as taskAttachmentStorageRepository from "@/repositories/task-attachment-storage.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/** List attachment storage paths without deleting rows. */
export async function collectTaskAttachmentStoragePaths(
  adminClient: Supabase,
  entity: TaskAttachmentEntity,
  entityIds: string[]
): Promise<{ paths: string[]; error: { message: string } | null }> {
  if (entityIds.length === 0) {
    return { paths: [], error: null };
  }

  const listed =
    await taskAttachmentRepository.listTaskAttachmentStoragePathsByEntityIds(
      adminClient,
      entity,
      entityIds
    );
  if (listed.error) {
    return { paths: [], error: { message: listed.error.message } };
  }

  return {
    paths: (listed.data ?? []).map((row) => row.storage_path),
    error: null,
  };
}

/** Best-effort Storage cleanup after DB rows are already gone. */
export async function removeTaskAttachmentStoragePaths(
  adminClient: Supabase,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  await taskAttachmentStorageRepository.removeTaskAttachmentStorageObjects(
    adminClient,
    paths
  );
}
