import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import { optimizeClassCoverForStorage } from "@/lib/manager/classes/optimize-class-cover";
import {
  buildClassCoverStoragePath,
  getClassCoverObjectPathFromPublicUrl,
} from "@/lib/manager/classes/storage-path";
import * as classCoverStorageRepository from "@/repositories/class-cover-storage.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  CLASS_STATUSES,
} from "@/lib/constants/manager-class-status";
import { updateClassSchema } from "@/lib/validators/manager/update-class";
import { pickClassCardGradientKey } from "@/lib/constants/class-card-gradients";
import { createClassSchema } from "@/lib/validators/manager/create-class";
import { createClassSessionSchema } from "@/lib/validators/manager/create-class-session";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { backfillSppsForClassBecomeInProgress } from "@/services/accounting/accounting-sync.service";
import { assertClassStructureUnlockedForComputedGrades } from "@/services/classes/class-computed-grade-lock.service";
import { ensureSessionAttendeesForMembers } from "@/services/classes/session.service";
import { removeStorageForStudentTaskUploads } from "@/services/classes/student-task-upload.service";
import {
  assertAssignedTeacherForClassMutation,
  assertTeacherMayCreateClass,
} from "@/services/classes/teacher-class-scope.service";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import {
  isUuid,
  loadClassDetailCounts,
  mapClassDetailToRowWithCounts,
  mapSessionRecord,
  normalizeOptionalString,
  toIsoOrNull,
  withPaymentSync,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";

async function uploadCoverBytes(
  adminClient: Supabase,
  classId: string,
  bytes: Buffer
): Promise<{ success: true; publicUrl: string } | { success: false; error: string }> {
  const storagePath = buildClassCoverStoragePath(classId);
  const uploaded = await classCoverStorageRepository.uploadClassCover(
    adminClient,
    storagePath,
    bytes
  );

  if (uploaded.error) {
    return {
      success: false,
      error: uploaded.error.message || "Unable to upload image.",
    };
  }

  const publicUrl = classCoverStorageRepository.getClassCoverPublicUrl(
    adminClient,
    storagePath
  );

  if (!publicUrl) {
    await classCoverStorageRepository.removeClassCovers(adminClient, [storagePath]);
    return { success: false, error: "Unable to upload image." };
  }

  return { success: true, publicUrl };
}

async function deleteStoredCover(
  adminClient: Supabase,
  imageUrl: string | null
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const objectPath = getClassCoverObjectPathFromPublicUrl(imageUrl);
  if (!objectPath) {
    return;
  }

  await classCoverStorageRepository.removeClassCovers(adminClient, [objectPath]);
}

async function prepareClassCover(
  file: File | null | undefined
): Promise<{ ok: true; bytes: Buffer | null } | { ok: false; error: string }> {
  if (!file || file.size <= 0) {
    return { ok: true, bytes: null };
  }

  const optimized = await optimizeClassCoverForStorage(file);
  if (!optimized.ok) {
    return optimized;
  }

  return { ok: true, bytes: optimized.bytes };
}

export type CreateClassResult =
  | { success: true; classRow: ManagerClassRow; message: string }
  | MutationFailure;

export async function createClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    subject_id: string;
    status: string;
    semester_id?: string;
    teacher_id?: string;
    image?: File | null;
    clone_subject_tasks?: boolean | string;
  }
): Promise<CreateClassResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const createScope = assertTeacherMayCreateClass(actor);
  if (!createScope.ok) {
    return { success: false, error: createScope.error };
  }

  const parsed = createClassSchema.safeParse({
    name: input.name,
    subject_id: input.subject_id,
    status: input.status,
    semester_id: input.semester_id ?? "",
    teacher_id: input.teacher_id ?? "",
    clone_subject_tasks: input.clone_subject_tasks ?? false,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const nextSemesterId =
    parsed.data.semester_id &&
    parsed.data.semester_id !== "unlinked" &&
    parsed.data.semester_id !== ""
      ? parsed.data.semester_id
      : null;

  const nextTeacherId =
    parsed.data.teacher_id &&
    parsed.data.teacher_id !== "none" &&
    parsed.data.teacher_id !== ""
      ? parsed.data.teacher_id
      : null;

  if (nextTeacherId && !isUuid(nextTeacherId)) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { teacher_id: ["Invalid teacher."] },
    };
  }

  const preparedCover = await prepareClassCover(input.image);
  if (!preparedCover.ok) {
    return { success: false, error: preparedCover.error };
  }

  const [subjectResult, semesterResult, teacherResult] = await Promise.all([
    subjectRepository.findSubjectById(adminClient, parsed.data.subject_id),
    nextSemesterId
      ? semesterRepository.findSemesterById(adminClient, nextSemesterId)
      : Promise.resolve({ data: null, error: null }),
    nextTeacherId
      ? profileRepository.findProfileById(adminClient, nextTeacherId)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message };
  }

  if (!subjectResult.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { subject_id: ["Subject not found."] },
    };
  }

  if (nextSemesterId) {
    if (semesterResult.error) {
      return { success: false, error: semesterResult.error.message };
    }

    if (!semesterResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { semester_id: ["Semester not found."] },
      };
    }
  }

  if (nextTeacherId) {
    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (!teacherResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { teacher_id: ["User not found."] },
      };
    }

    if (teacherResult.data.role !== ROLES.TEACHER) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { teacher_id: ["Only teachers can be assigned to a class."] },
      };
    }
  }

  const cardGradient = pickClassCardGradientKey(
    `${parsed.data.name.trim()}:${parsed.data.subject_id}:${crypto.randomUUID()}`
  );

  const { data, error } = await classRepository.createClass(adminClient, {
    name: parsed.data.name.trim(),
    subject_id: parsed.data.subject_id,
    status: parsed.data.status,
    semester_id: nextSemesterId,
    card_gradient: cardGradient,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to create class. Please try again.",
    };
  }

  if (nextTeacherId) {
    const assignment = await classTeacherRepository.createClassTeacher(
      adminClient,
      {
        teacher_id: nextTeacherId,
        class_id: data.id,
        assigned_by: actor.userId,
      }
    );

    if (assignment.error || !assignment.data) {
      return {
        success: false,
        error:
          assignment.error?.message ??
          "Class was created, but the teacher could not be assigned.",
      };
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      table_name: "class_teacher",
      record_id: assignment.data.id,
      new_data: {
        class_id: assignment.data.class_id,
        teacher_id: assignment.data.teacher_id,
      },
    });
  }

  let detail = data as ClassDetailRecord;
  let imageChanged = false;
  let message = "Class created.";

  if (preparedCover.bytes) {
    const uploaded = await uploadCoverBytes(
      adminClient,
      detail.id,
      preparedCover.bytes
    );

    if (!uploaded.success) {
      message = "Class created, but the cover image could not be saved.";
    } else {
      const saved = await classRepository.updateClassImageUrl(
        adminClient,
        detail.id,
        uploaded.publicUrl
      );

      if (saved.error || !saved.data) {
        await deleteStoredCover(adminClient, uploaded.publicUrl);
        message = "Class created, but the cover image could not be saved.";
      } else {
        detail = saved.data as ClassDetailRecord;
        imageChanged = true;
      }
    }
  }

  const classRow = mapClassDetailToRowWithCounts(detail, {
    enrollment_count: 0,
    teacher_count: nextTeacherId ? 1 : 0,
    completed_sessions: 0,
  });

  if (parsed.data.clone_subject_tasks) {
    const { cloneSubjectTasksOntoClass } = await import(
      "@/services/classes/class-tasks.service"
    );
    const cloneResult = await cloneSubjectTasksOntoClass(
      adminClient,
      data.id,
      parsed.data.subject_id
    );
    if (cloneResult.error) {
      return {
        success: false,
        error:
          cloneResult.error ||
          "Class was created, but subject tasks could not be cloned.",
      };
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    table_name: "classes",
    record_id: classRow.id,
    new_data: {
      name: classRow.name,
      subject_id: classRow.subject_id,
      status: classRow.status,
      semester_id: classRow.semester_id,
      teacher_id: nextTeacherId,
      image_changed: imageChanged,
      clone_subject_tasks: parsed.data.clone_subject_tasks,
    },
  });

  return {
    success: true,
    classRow,
    message,
  };
}

export type UpdateClassResult =
  | { success: true; classRow: ManagerClassRow; message: string }
  | MutationFailure;

export async function updateClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    name: string;
    subject_id: string;
    status: string;
    semester_id?: string;
    image?: File | null;
    removeImage?: boolean;
    subject_task_mode?: string;
  }
): Promise<UpdateClassResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const parsed = updateClassSchema.safeParse({
    name: input.name,
    subject_id: input.subject_id,
    status: input.status,
    semester_id: input.semester_id ?? "",
    subject_task_mode: input.subject_task_mode,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const nextSemesterId =
    parsed.data.semester_id && parsed.data.semester_id !== "unlinked"
      ? parsed.data.semester_id
      : null;

  const preparedCover = await prepareClassCover(input.image);
  if (!preparedCover.ok) {
    return { success: false, error: preparedCover.error };
  }

  const [existing, counts, subjectResult, semesterResult] = await Promise.all([
    classRepository.findClassDetailById(adminClient, input.class_id),
    loadClassDetailCounts(adminClient, input.class_id),
    subjectRepository.findSubjectById(adminClient, parsed.data.subject_id),
    nextSemesterId
      ? semesterRepository.findSemesterById(adminClient, nextSemesterId)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Class not found." };
  }

  if (subjectResult.error) {
    return { success: false, error: subjectResult.error.message };
  }

  if (!subjectResult.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { subject_id: ["Subject not found."] },
    };
  }

  if (nextSemesterId) {
    if (semesterResult.error) {
      return { success: false, error: semesterResult.error.message };
    }

    if (!semesterResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { semester_id: ["Semester not found."] },
      };
    }
  }

  const subjectChanged =
    (existing.data.subject_id ?? "") !== parsed.data.subject_id;

  if (subjectChanged && !parsed.data.subject_task_mode) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        subject_task_mode: [
          "Choose whether to keep current class tasks or replace them from the new subject.",
        ],
      },
    };
  }

  if (subjectChanged && parsed.data.subject_task_mode === "replace") {
    const structureGuard = await assertClassStructureUnlockedForComputedGrades(
      adminClient,
      input.class_id
    );
    if (!structureGuard.ok) {
      return { success: false, error: structureGuard.error };
    }

    const existingTasks = await classTaskRepository.listClassTasksByClassId(
      adminClient,
      input.class_id
    );
    if (existingTasks.error) {
      return { success: false, error: existingTasks.error.message };
    }

    for (const task of existingTasks.data ?? []) {
      const studentTasksResult =
        await studentTaskRepository.listStudentTasksByTaskId(
          adminClient,
          task.id
        );
      if (studentTasksResult.error) {
        return { success: false, error: studentTasksResult.error.message };
      }
      const studentTaskIds = (studentTasksResult.data ?? []).map((row) => row.id);
      const storageCleanup = await removeStorageForStudentTaskUploads(
        adminClient,
        studentTaskIds
      );
      if (storageCleanup.error) {
        return {
          success: false,
          error:
            storageCleanup.error.message ||
            "Unable to delete student task upload files.",
        };
      }
    }

    const deleteTasks = await classTaskRepository.deleteClassTasksByClassId(
      adminClient,
      input.class_id
    );
    if (deleteTasks.error) {
      return { success: false, error: deleteTasks.error.message };
    }

    const { cloneSubjectTasksOntoClass } = await import(
      "@/services/classes/class-tasks.service"
    );
    const cloneResult = await cloneSubjectTasksOntoClass(
      adminClient,
      input.class_id,
      parsed.data.subject_id
    );
    if (cloneResult.error) {
      return { success: false, error: cloneResult.error };
    }
  }

  const { data, error } = await classRepository.updateClass(
    adminClient,
    input.class_id,
    {
      name: parsed.data.name.trim(),
      subject_id: parsed.data.subject_id,
      status: parsed.data.status,
      semester_id: nextSemesterId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update class. Please try again.",
    };
  }

  let detail = data as ClassDetailRecord;
  let imageChanged = false;
  let message = "Class updated.";
  const previousUrl = existing.data.image_url;

  if (preparedCover.bytes) {
    const uploaded = await uploadCoverBytes(
      adminClient,
      detail.id,
      preparedCover.bytes
    );

    if (!uploaded.success) {
      message = "Class updated, but the cover image could not be saved.";
    } else {
      const saved = await classRepository.updateClassImageUrl(
        adminClient,
        detail.id,
        uploaded.publicUrl
      );

      if (saved.error || !saved.data) {
        await deleteStoredCover(adminClient, uploaded.publicUrl);
        message = "Class updated, but the cover image could not be saved.";
      } else {
        detail = saved.data as ClassDetailRecord;
        imageChanged = true;
        if (previousUrl && previousUrl !== uploaded.publicUrl) {
          await deleteStoredCover(adminClient, previousUrl);
        }
      }
    }
  } else if (input.removeImage && previousUrl) {
    const cleared = await classRepository.updateClassImageUrl(
      adminClient,
      detail.id,
      null
    );

    if (cleared.error || !cleared.data) {
      return {
        success: false,
        error: "Unable to remove the cover image.",
      };
    }

    detail = cleared.data as ClassDetailRecord;
    imageChanged = true;
    await deleteStoredCover(adminClient, previousUrl);
  }

  const classRow = mapClassDetailToRowWithCounts(detail, counts);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    table_name: "classes",
    record_id: classRow.id,
    old_data: {
      name: existing.data.name,
      subject_id: existing.data.subject_id,
      status: existing.data.status,
      semester_id: existing.data.semester_id,
    },
    new_data: {
      name: classRow.name,
      subject_id: classRow.subject_id,
      status: classRow.status,
      semester_id: classRow.semester_id,
      image_changed: imageChanged,
      subject_task_mode: subjectChanged
        ? parsed.data.subject_task_mode ?? "keep"
        : null,
    },
  });

  return {
    success: true,
    classRow,
    message,
  };
}

export type UpdateClassStatusResult =
  | {
      success: true;
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function updateClassStatusForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string; status: string }
): Promise<UpdateClassStatusResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_CHANGE_STATUS);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const parsed = updateClassSchema
    .pick({ status: true })
    .safeParse({ status: input.status });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existing, counts] = await Promise.all([
    classRepository.findClassDetailById(adminClient, input.class_id),
    loadClassDetailCounts(adminClient, input.class_id),
  ]);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Class not found." };
  }

  const nextStatus = parsed.data.status;
  const previousStatus = existing.data.status;
  const semesterId = existing.data.semester_id;

  if (
    nextStatus === CLASS_STATUSES.IN_PROGRESS &&
    semesterId &&
    previousStatus !== CLASS_STATUSES.IN_PROGRESS
  ) {
    const { data: otherInProgress, error: otherError } =
      await classRepository.findOtherInProgressClassBySemesterId(
        adminClient,
        semesterId,
        input.class_id
      );

    if (otherError) {
      return { success: false, error: otherError.message };
    }

    if (otherInProgress) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          status: [
            "This semester already has an in-progress class. Set that class to another status first.",
          ],
        },
      };
    }
  }

  const { data, error } = await classRepository.updateClassStatus(
    adminClient,
    input.class_id,
    nextStatus
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update class status.",
    };
  }

  const classRow = mapClassDetailToRowWithCounts(
    data as ClassDetailRecord,
    counts
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    table_name: "classes",
    record_id: classRow.id,
    old_data: { status: previousStatus },
    new_data: { status: classRow.status },
  });

  let warning: string | undefined;

  if (
    nextStatus === CLASS_STATUSES.IN_PROGRESS &&
    previousStatus !== CLASS_STATUSES.IN_PROGRESS
  ) {
    const sync = await withPaymentSync(
      adminClient,
      actor,
      {
        studentId: "",
        classId: input.class_id,
        operation: "class_status_in_progress_backfill",
      },
      () =>
        backfillSppsForClassBecomeInProgress(
          adminClient,
          input.class_id,
          actor
        )
    );
    warning = sync.warning;
  }

  return {
    success: true,
    classRow,
    message: "Class status updated.",
    warning,
  };
}

export type CreateClassSessionResult =
  | {
      success: true;
      session: ManagerClassSessionRow;
      classRow: ManagerClassRow;
      message: string;
    }
  | MutationFailure;

export async function createClassSessionForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    topic: string;
    session_report?: string;
    starts_at: string;
    ends_at: string;
  }
): Promise<CreateClassSessionResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SESSIONS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const parsed = createClassSessionSchema.safeParse({
    topic: input.topic,
    session_report: input.session_report,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existing, structureGuard, maxOrderResult, counts] = await Promise.all([
    classRepository.findClassDetailById(adminClient, input.class_id),
    assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id),
    sessionRepository.getMaxSessionNbOrderByClassId(adminClient, input.class_id),
    loadClassDetailCounts(adminClient, input.class_id),
  ]);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Class not found." };
  }

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  if (maxOrderResult.error) {
    return { success: false, error: maxOrderResult.error.message };
  }

  const nextNbOrder = (maxOrderResult.data?.nb_order ?? 0) + 1;
  const startsAt = toIsoOrNull(parsed.data.starts_at);
  const endsAt = toIsoOrNull(parsed.data.ends_at);

  if (!startsAt || !endsAt) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        starts_at: ["Invalid date and time."],
      },
    };
  }

  const { data, error } = await sessionRepository.createSession(adminClient, {
    class_id: input.class_id,
    nb_order: nextNbOrder,
    topic: parsed.data.topic.trim(),
    session_report: normalizeOptionalString(parsed.data.session_report),
    starts_at: startsAt,
    ends_at: endsAt,
  });

  if (error || !data) {
    const normalized = (error?.message ?? "").toLowerCase();
    if (normalized.includes("unique") || normalized.includes("duplicate")) {
      return {
        success: false,
        error: "A session with this order already exists for the class.",
      };
    }

    return {
      success: false,
      error: error?.message ?? "Unable to create session. Please try again.",
    };
  }

  const session = mapSessionRecord(data as SessionRecord);

  try {
    await ensureSessionAttendeesForMembers(
      adminClient,
      session.id,
      input.class_id
    );
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Session created, but attendance rows could not be seeded.",
    };
  }

  const classRow = mapClassDetailToRowWithCounts(
    existing.data as ClassDetailRecord,
    {
      ...counts,
      completed_sessions: counts.completed_sessions + 1,
    }
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    table_name: "sessions",
    record_id: session.id,
    new_data: {
      class_id: session.class_id,
      nb_order: session.nb_order,
      topic: session.topic,
      session_report: session.session_report,
    },
  });

  return {
    success: true,
    session,
    classRow,
    message: "Session created.",
  };
}
