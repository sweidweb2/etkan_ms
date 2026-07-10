import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { createSubjectSchema } from "@/lib/validators/manager/create-subject";
import * as classRepository from "@/repositories/class.repository";
import type { ClassRecord } from "@/repositories/class.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import type { SubjectRecord } from "@/repositories/subject.repository";
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

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

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

function mapClassRecordToSubjectClassRow(record: ClassRecord): ManagerSubjectClassRow {
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

export async function listSubjectsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerSubjectRow[]> {
  assertManagerRole(actorRole);

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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    name: string;
    syllabus_link?: string;
    reference_link?: string;
    handout_link?: string;
  }
): Promise<CreateSubjectResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

export async function getSubjectForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  subjectId: string
): Promise<ManagerSubjectRow | null> {
  assertManagerRole(actorRole);

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
  actorRole: RoleValue | null,
  subjectId: string
): Promise<ManagerSubjectClassRow[]> {
  assertManagerRole(actorRole);

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
