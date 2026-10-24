import "server-only";

import JSZip from "jszip";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { runWithBackupZipLimit } from "@/lib/concurrency/heavy-cpu";
import {
  buildStudentTaskUploadZipEntryPath,
  getStudentTaskUploadsZipFilename,
  sanitizeZipPathSegment,
  uniqueZipSiblingName,
} from "@/lib/export/student-task-uploads-zip";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as studentTaskStorageRepository from "@/repositories/student-task-storage.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  buildStudentDisplayByUserId,
  isUuid,
} from "@/services/classes/session-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const ZIP_DOWNLOAD_CONCURRENCY = 3;

export type ClassTaskStudentUploadsZipResult =
  | {
      success: true;
      buffer: Buffer;
      fileName: string;
      fileCount: number;
      failedCount: number;
      studentFolderCount: number;
    }
  | {
      success: false;
      error: string;
      status: 403 | 404 | 500;
    };

type ZipDownloadJob = {
  storagePath: string;
  zipPath: string;
};

async function downloadUploadsIntoZip(
  adminClient: Supabase,
  jobs: ZipDownloadJob[],
  zip: JSZip
): Promise<number> {
  let nextIndex = 0;
  let failedCount = 0;

  async function worker() {
    while (nextIndex < jobs.length) {
      const current = nextIndex;
      nextIndex += 1;
      const job = jobs[current];
      if (!job) {
        continue;
      }

      try {
        const downloaded =
          await studentTaskStorageRepository.downloadStudentTaskStorageObject(
            adminClient,
            job.storagePath
          );

        if (downloaded.error || !downloaded.data) {
          failedCount += 1;
          continue;
        }

        zip.file(job.zipPath, await downloaded.data.arrayBuffer());
      } catch {
        failedCount += 1;
      }
    }
  }

  const workerCount = Math.min(ZIP_DOWNLOAD_CONCURRENCY, jobs.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return failedCount;
}

/**
 * Pack every student upload for a class task into a ZIP:
 * `{taskTitle}/{studentName}/{fileName}`.
 * Teachers may only export tasks for classes they are assigned to.
 */
export async function buildClassTaskStudentUploadsZipForActor(
  adminClient: Supabase,
  actor: AuditActor,
  taskId: string
): Promise<ClassTaskStudentUploadsZipResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actor.userId,
    PERMISSIONS.TASKS_EXPORT_UPLOADS
  );
  if (unauthorized) {
    return { success: false, error: unauthorized, status: 403 };
  }

  if (!isUuid(taskId)) {
    return { success: false, error: "Task not found.", status: 404 };
  }

  const taskResult = await classTaskRepository.findClassTaskById(
    adminClient,
    taskId
  );

  if (taskResult.error) {
    return {
      success: false,
      error: taskResult.error.message || "Unable to load task.",
      status: 500,
    };
  }

  if (!taskResult.data) {
    return { success: false, error: "Task not found.", status: 404 };
  }

  const teacherGate = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    taskResult.data.class_id
  );
  if (!teacherGate.ok) {
    return { success: false, error: teacherGate.error, status: 403 };
  }

  const studentTasksResult =
    await studentTaskRepository.listStudentTasksByTaskId(adminClient, taskId);

  if (studentTasksResult.error) {
    return {
      success: false,
      error: studentTasksResult.error.message || "Unable to load student tasks.",
      status: 500,
    };
  }

  const studentTasks = studentTasksResult.data ?? [];
  const studentTaskIds = studentTasks.map((row) => row.id);

  const [displayByUserId, uploadsResult] = await Promise.all([
    buildStudentDisplayByUserId(
      adminClient,
      studentTasks.map((row) => row.student_id)
    ),
    studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds(
      adminClient,
      studentTaskIds
    ),
  ]);

  if (uploadsResult.error) {
    return {
      success: false,
      error: uploadsResult.error.message || "Unable to load uploads.",
      status: 500,
    };
  }

  const uploads = uploadsResult.data ?? [];
  const uploadsByStudentTaskId = new Map<string, typeof uploads>();
  for (const upload of uploads) {
    const list = uploadsByStudentTaskId.get(upload.student_task_id) ?? [];
    list.push(upload);
    uploadsByStudentTaskId.set(upload.student_task_id, list);
  }

  const rootFolder = sanitizeZipPathSegment(taskResult.data.title);
  const zip = new JSZip();
  const usedStudentFolders = new Map<string, number>();
  const jobs: ZipDownloadJob[] = [];

  const sortedStudentTasks = [...studentTasks].sort((left, right) => {
    const leftName =
      displayByUserId.get(left.student_id)?.full_name ?? "Unknown student";
    const rightName =
      displayByUserId.get(right.student_id)?.full_name ?? "Unknown student";
    return leftName.localeCompare(rightName);
  });

  for (const studentTask of sortedStudentTasks) {
    const displayName =
      displayByUserId.get(studentTask.student_id)?.full_name ??
      "Unknown student";
    const studentFolder = uniqueZipSiblingName(
      sanitizeZipPathSegment(displayName),
      usedStudentFolders
    );

    const studentUploads = [
      ...(uploadsByStudentTaskId.get(studentTask.id) ?? []),
    ].sort(
      (left, right) =>
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime()
    );

    if (studentUploads.length === 0) {
      zip.folder(`${rootFolder}/${studentFolder}`);
      continue;
    }

    const usedFileNames = new Map<string, number>();
    for (const upload of studentUploads) {
      const fileName = uniqueZipSiblingName(
        sanitizeZipPathSegment(upload.file_name),
        usedFileNames
      );
      jobs.push({
        storagePath: upload.storage_path,
        zipPath: buildStudentTaskUploadZipEntryPath({
          rootFolder,
          studentFolder,
          fileName,
        }),
      });
    }
  }

  const failedCount =
    jobs.length === 0 ? 0 : await downloadUploadsIntoZip(adminClient, jobs, zip);

  const buffer = Buffer.from(
    await runWithBackupZipLimit(() =>
      zip.generateAsync({ type: "arraybuffer" })
    )
  );

  return {
    success: true,
    buffer,
    fileName: getStudentTaskUploadsZipFilename(taskResult.data.title),
    fileCount: jobs.length,
    failedCount,
    studentFolderCount: sortedStudentTasks.length,
  };
}
