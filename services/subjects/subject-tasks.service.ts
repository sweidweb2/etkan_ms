import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { YES_NO_MAX_GRADE } from "@/lib/constants/task-yes-no";
import { createSubjectTaskSchema } from "@/lib/validators/manager/create-subject-task";
import { updateSubjectTaskSchema } from "@/lib/validators/manager/update-subject-task";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as subjectRepository from "@/repositories/subject.repository";
import * as subjectTaskRepository from "@/repositories/subject-task.repository";
import type { SubjectTaskRecord } from "@/repositories/subject-task.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerSubjectTaskRow } from "@/types/manager-subject-task";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationSuccess<T> = {
  success: true;
  message: string;
} & T;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function mapSubjectTask(record: SubjectTaskRecord): ManagerSubjectTaskRow {
  return {
    id: record.id,
    subject_id: record.subject_id,
    title: record.title,
    description: record.description,
    period: record.period,
    max_grade: record.max_grade,
    is_yes_no: record.is_yes_no,
    sort_order: record.sort_order,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function fieldErrorsFromZod(
  fieldErrors: Record<string, string[] | undefined>
): FieldErrors {
  return zodFieldErrors(fieldErrors);
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeMaxGrade(
  value: "" | number | undefined,
  isYesNo: boolean
): number | null {
  if (isYesNo) {
    return YES_NO_MAX_GRADE;
  }
  if (value === "" || value === undefined) {
    return null;
  }
  return value;
}

export async function listSubjectTasksForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  subjectId: string
): Promise<ManagerSubjectTaskRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_TASKS_VIEW
  );

  const { data, error } =
    await subjectTaskRepository.listSubjectTasksBySubjectId(
      adminClient,
      subjectId
    );
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SubjectTaskRecord[]).map(mapSubjectTask);
}

export async function createSubjectTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<
  MutationSuccess<{ task: ManagerSubjectTaskRow }> | MutationFailure
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_TASKS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createSubjectTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error.flatten().fieldErrors),
    };
  }

  const { data: subject, error: subjectError } =
    await subjectRepository.findSubjectById(
      adminClient,
      parsed.data.subject_id
    );
  if (subjectError) {
    return { success: false, error: subjectError.message };
  }
  if (!subject) {
    return { success: false, error: "Subject not found." };
  }

  const isYesNo = parsed.data.is_yes_no ?? false;
  const { data, error } = await subjectTaskRepository.createSubjectTask(
    adminClient,
    {
      subject_id: parsed.data.subject_id,
      title: parsed.data.title,
      description: normalizeOptionalString(parsed.data.description),
      period: parsed.data.period,
      max_grade: normalizeMaxGrade(parsed.data.max_grade, isYesNo),
      is_yes_no: isYesNo,
      sort_order: parsed.data.sort_order,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to create subject task.",
    };
  }

  const task = mapSubjectTask(data as SubjectTaskRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "subject_tasks",
    record_id: task.id,
    new_data: {
      subject_id: task.subject_id,
      title: task.title,
      period: task.period,
      max_grade: task.max_grade,
      is_yes_no: task.is_yes_no,
      sort_order: task.sort_order,
    },
    metadata: { note: "Subject task created." },
  });

  return {
    success: true,
    message: "Subject task was created.",
    task,
  };
}

export async function updateSubjectTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  rawInput: unknown
): Promise<
  MutationSuccess<{ task: ManagerSubjectTaskRow }> | MutationFailure
> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_TASKS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateSubjectTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error.flatten().fieldErrors),
    };
  }

  const { data: existing, error: existingError } =
    await subjectTaskRepository.findSubjectTaskById(
      adminClient,
      parsed.data.id
    );
  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Subject task not found." };
  }
  if (existing.subject_id !== parsed.data.subject_id) {
    return { success: false, error: "Subject task not found." };
  }

  const isYesNo = parsed.data.is_yes_no ?? existing.is_yes_no;
  const { data, error } = await subjectTaskRepository.updateSubjectTaskById(
    adminClient,
    parsed.data.id,
    {
      title: parsed.data.title,
      description: normalizeOptionalString(parsed.data.description),
      period: parsed.data.period,
      max_grade: normalizeMaxGrade(parsed.data.max_grade, isYesNo),
      is_yes_no: isYesNo,
      sort_order: parsed.data.sort_order,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update subject task.",
    };
  }

  const task = mapSubjectTask(data as SubjectTaskRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subject_tasks",
    record_id: task.id,
    old_data: {
      title: existing.title,
      period: existing.period,
      max_grade: existing.max_grade,
      is_yes_no: existing.is_yes_no,
      sort_order: existing.sort_order,
    },
    new_data: {
      title: task.title,
      period: task.period,
      max_grade: task.max_grade,
      is_yes_no: task.is_yes_no,
      sort_order: task.sort_order,
    },
    metadata: { note: "Subject task updated." },
  });

  return {
    success: true,
    message: "Subject task was updated.",
    task,
  };
}

export async function deleteSubjectTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  taskId: string
): Promise<{ success: true; message: string } | MutationFailure> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_TASKS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const { data: existing, error: existingError } =
    await subjectTaskRepository.findSubjectTaskById(adminClient, taskId);
  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Subject task not found." };
  }

  const { error } = await subjectTaskRepository.deleteSubjectTaskById(
    adminClient,
    taskId
  );
  if (error) {
    return { success: false, error: error.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "subject_tasks",
    record_id: taskId,
    old_data: {
      subject_id: existing.subject_id,
      title: existing.title,
      period: existing.period,
      max_grade: existing.max_grade,
      sort_order: existing.sort_order,
    },
    metadata: { note: "Subject task deleted." },
  });

  return { success: true, message: "Subject task was deleted." };
}
