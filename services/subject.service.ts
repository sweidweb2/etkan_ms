import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { createSubjectSchema } from "@/lib/validators/manager/create-subject";
import { updateSubjectSchema } from "@/lib/validators/manager/update-subject";
import * as classRepository from "@/repositories/class.repository";
import type { ClassRecord } from "@/repositories/class.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import type { SubjectRecord } from "@/repositories/subject.repository";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerSubjectRow } from "@/types/manager-subject";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateSubjectSuccess = {
  success: true;
  subject: ManagerSubjectRow;
  message: string;
};

export type CreateSubjectFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateSubjectResult = CreateSubjectSuccess | CreateSubjectFailure;

export type UpdateSubjectSuccess = {
  success: true;
  subject: ManagerSubjectRow;
  message: string;
};

export type UpdateSubjectFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateSubjectResult = UpdateSubjectSuccess | UpdateSubjectFailure;

export type DeleteSubjectSuccess = {
  success: true;
  message: string;
};

export type DeleteSubjectFailure = {
  success: false;
  error: string;
};

export type DeleteSubjectResult = DeleteSubjectSuccess | DeleteSubjectFailure;

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapClassStatus(status: string | null): ClassStatusValue {
  if (
    status === CLASS_STATUSES.SCHEDULED ||
    status === CLASS_STATUSES.IN_PROGRESS ||
    status === CLASS_STATUSES.DONE ||
    status === CLASS_STATUSES.PAUSED ||
    status === CLASS_STATUSES.STOPPED
  ) {
    return status;
  }

  return CLASS_STATUSES.SCHEDULED;
}

function mapClassRecordToSubjectClassRow(
  record: ClassRecord
): ManagerSubjectClassRow {
  return {
    id: record.id,
    subject_id: record.subject_id ?? "",
    name: record.name,
    status: mapClassStatus(record.status),
    created_at: record.created_at ?? "",
  };
}

function mapSubjectRecordToRow(
  record: SubjectRecord,
  classCount: number
): ManagerSubjectRow {
  return {
    id: record.id,
    name: record.name,
    syllabus_link: record.syllabus_link,
    reference_link: record.reference_link,
    handout_link: record.handout_link,
    created_at: record.created_at ?? "",
    nb_sessions: record.nb_sessions,
    class_count: classCount,
  };
}

async function buildClassCountBySubjectId(
  adminClient: Supabase
): Promise<Map<string, number>> {
  const { data, error } = await classRepository.listClassSubjectIds(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    if (!row.subject_id) {
      continue;
    }

    counts.set(row.subject_id, (counts.get(row.subject_id) ?? 0) + 1);
  }

  return counts;
}

function mapCreateSubjectError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A subject with this name already exists.";
  }

  return "Unable to create subject. Please try again.";
}

function mapUpdateSubjectError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A subject with this name already exists.";
  }

  return "Unable to update subject. Please try again.";
}

export async function listSubjectsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSubjectRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);

  const [subjectsResult, classCounts] = await Promise.all([
    subjectRepository.listSubjects(adminClient),
    buildClassCountBySubjectId(adminClient),
  ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }

  return (subjectsResult.data ?? []).map((subject) =>
    mapSubjectRecordToRow(subject, classCounts.get(subject.id) ?? 0)
  );
}

export async function createSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    syllabus_link?: string;
    reference_link?: string;
    handout_link?: string;
  }
): Promise<CreateSubjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createSubjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, syllabus_link, reference_link, handout_link } = parsed.data;
  const normalizedName = name.trim();

  const existing = await subjectRepository.findSubjectByName(
    adminClient,
    normalizedName
  );

  if (existing.error) {
    return {
      success: false,
      error: mapCreateSubjectError(existing.error.message),
    };
  }

  if (existing.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A subject with this name already exists."] },
    };
  }

  const { data, error } = await subjectRepository.createSubject(adminClient, {
    name: normalizedName,
    syllabus_link: normalizeOptionalString(syllabus_link),
    reference_link: normalizeOptionalString(reference_link),
    handout_link: normalizeOptionalString(handout_link),
    nb_sessions: 0,
  });

  if (error || !data) {
    return {
      success: false,
      error: mapCreateSubjectError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "subjects",
    record_id: data.id,
    new_data: {
      name: data.name,
      syllabus_link: data.syllabus_link,
      reference_link: data.reference_link,
      handout_link: data.handout_link,
      nb_sessions: data.nb_sessions,
    },
    metadata: { note: "Subject created." },
  });

  return {
    success: true,
    subject: mapSubjectRecordToRow(data, 0),
    message: "Subject created.",
  };
}

export async function updateSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    syllabus_link?: string;
    reference_link?: string;
    handout_link?: string;
  }
): Promise<UpdateSubjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateSubjectSchema.safeParse({
    name: input.name,
    syllabus_link: input.syllabus_link,
    reference_link: input.reference_link,
    handout_link: input.handout_link,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id } = input;
  const { name, syllabus_link, reference_link, handout_link } = parsed.data;
  const normalizedName = name.trim();
  const normalizedSyllabus = normalizeOptionalString(syllabus_link);
  const normalizedReference = normalizeOptionalString(reference_link);
  const normalizedHandout = normalizeOptionalString(handout_link);

  const existingSubject = await subjectRepository.findSubjectById(
    adminClient,
    id
  );

  if (existingSubject.error) {
    return {
      success: false,
      error: mapUpdateSubjectError(existingSubject.error.message),
    };
  }

  if (!existingSubject.data) {
    return { success: false, error: "Subject not found." };
  }

  const existingByName = await subjectRepository.findSubjectByName(
    adminClient,
    normalizedName
  );

  if (existingByName.error) {
    return {
      success: false,
      error: mapUpdateSubjectError(existingByName.error.message),
    };
  }

  if (existingByName.data && existingByName.data.id !== id) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A subject with this name already exists."] },
    };
  }

  const classCountResult = await classRepository.countClassesBySubjectId(
    adminClient,
    id
  );

  if (classCountResult.error) {
    return {
      success: false,
      error: mapUpdateSubjectError(classCountResult.error.message),
    };
  }

  const { data, error } = await subjectRepository.updateSubjectById(
    adminClient,
    id,
    {
      name: normalizedName,
      syllabus_link: normalizedSyllabus,
      reference_link: normalizedReference,
      handout_link: normalizedHandout,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateSubjectError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "subjects",
    record_id: data.id,
    old_data: {
      name: existingSubject.data.name,
      syllabus_link: existingSubject.data.syllabus_link,
      reference_link: existingSubject.data.reference_link,
      handout_link: existingSubject.data.handout_link,
    },
    new_data: {
      name: data.name,
      syllabus_link: data.syllabus_link,
      reference_link: data.reference_link,
      handout_link: data.handout_link,
    },
    metadata: { note: "Subject updated." },
  });

  return {
    success: true,
    subject: mapSubjectRecordToRow(data, classCountResult.count ?? 0),
    message: "Subject updated.",
  };
}

export async function deleteSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  subjectId: string
): Promise<DeleteSubjectResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SUBJECTS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existingSubject = await subjectRepository.findSubjectById(
    adminClient,
    subjectId
  );

  if (existingSubject.error) {
    return {
      success: false,
      error: "Unable to delete subject. Please try again.",
    };
  }

  if (!existingSubject.data) {
    return { success: false, error: "Subject not found." };
  }

  const classCountResult = await classRepository.countClassesBySubjectId(
    adminClient,
    subjectId
  );

  if (classCountResult.error) {
    return {
      success: false,
      error: "Unable to delete subject. Please try again.",
    };
  }

  if ((classCountResult.count ?? 0) > 0) {
    return {
      success: false,
      error: "Remove or reassign linked classes before deleting this subject.",
    };
  }

  const { error } = await subjectRepository.deleteSubjectById(
    adminClient,
    subjectId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete subject. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "subjects",
    record_id: subjectId,
    old_data: {
      name: existingSubject.data.name,
      syllabus_link: existingSubject.data.syllabus_link,
      reference_link: existingSubject.data.reference_link,
      handout_link: existingSubject.data.handout_link,
      nb_sessions: existingSubject.data.nb_sessions,
    },
    metadata: { note: "Subject deleted." },
  });

  return {
    success: true,
    message: "Subject deleted.",
  };
}

export async function getSubjectForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  subjectId: string
): Promise<ManagerSubjectRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);

  const [subjectResult, classCountResult] = await Promise.all([
    subjectRepository.findSubjectById(adminClient, subjectId),
    classRepository.countClassesBySubjectId(adminClient, subjectId),
  ]);

  if (subjectResult.error) {
    throw new Error(subjectResult.error.message);
  }

  if (classCountResult.error) {
    throw new Error(classCountResult.error.message);
  }

  if (!subjectResult.data) {
    return null;
  }

  return mapSubjectRecordToRow(
    subjectResult.data,
    classCountResult.count ?? 0
  );
}

export async function listSubjectClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  subjectId: string
): Promise<ManagerSubjectClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SUBJECTS_VIEW);

  const subjectResult = await subjectRepository.findSubjectById(
    adminClient,
    subjectId
  );

  if (subjectResult.error) {
    throw new Error(subjectResult.error.message);
  }

  if (!subjectResult.data) {
    return [];
  }

  const { data, error } = await classRepository.listClassesBySubjectId(
    adminClient,
    subjectId
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapClassRecordToSubjectClassRow);
}
