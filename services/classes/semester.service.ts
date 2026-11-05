import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { createPhaseSchema } from "@/lib/validators/manager/create-phase";
import { updatePhaseSchema } from "@/lib/validators/manager/update-phase";
import { generateSemesterCode } from "@/lib/manager/generate-semester-code";
import * as classRepository from "@/repositories/class.repository";
import type { ClassWithSubjectRecord } from "@/repositories/class.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import type { SemesterRecord } from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerSemesterRow } from "@/types/manager-phase";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
import type { ManagerSemesterPaymentPhaseRow } from "@/types/manager-semester-payment-phase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SEMESTER_CODE_MAX_ATTEMPTS = 40;

async function allocateUniqueSemesterCode(
  adminClient: Supabase
): Promise<
  | { success: true; semesterCode: string }
  | { success: false; error: string }
> {
  for (let attempt = 0; attempt < SEMESTER_CODE_MAX_ATTEMPTS; attempt += 1) {
    const semesterCode = generateSemesterCode();
    const existing = await semesterRepository.findSemesterByCode(
      adminClient,
      semesterCode
    );

    if (existing.error) {
      return {
        success: false,
        error: mapCreateSemesterError(existing.error.message),
      };
    }

    if (!existing.data) {
      return { success: true, semesterCode };
    }
  }

  return {
    success: false,
    error: "Unable to allocate a unique semester code. Please try again.",
  };
}

export type CreateSemesterSuccess = {
  success: true;
  semester: ManagerSemesterRow;
  message: string;
};

export type CreateSemesterFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateSemesterResult = CreateSemesterSuccess | CreateSemesterFailure;

export type UpdateSemesterResult = CreateSemesterResult;

function mapSemesterRecordToRow(record: SemesterRecord): ManagerSemesterRow {
  return {
    id: record.id,
    name: record.name,
    semester_code: record.semester_code,
    created_at: record.created_at ?? "",
  };
}

const FORM_ERROR_MESSAGE = "Please fix the errors below.";
const SEMESTER_NAME_TAKEN_MESSAGE = "A semester with this name already exists.";
const SEMESTER_CODE_TAKEN_MESSAGE = "This semester code is already in use.";

function isSemesterCodeConflictError(message: string | undefined): boolean {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("semester_code") &&
    (normalized.includes("duplicate") || normalized.includes("unique"))
  );
}

function semesterCodeTakenFailure(): CreateSemesterFailure {
  return {
    success: false,
    error: FORM_ERROR_MESSAGE,
    fieldErrors: { semester_code: [SEMESTER_CODE_TAKEN_MESSAGE] },
  };
}

/** Name/code uniqueness checks; `excludeSemesterId` skips the semester being edited. */
async function findSemesterConflicts(
  adminClient: Supabase,
  input: {
    name: string | null;
    semesterCode: string | null;
    excludeSemesterId?: string;
  }
): Promise<
  | { success: true; fieldErrors: FieldErrors | null }
  | { success: false; error: string }
> {
  const [nameResult, codeResult] = await Promise.all([
    input.name
      ? semesterRepository.findSemesterByName(adminClient, input.name)
      : null,
    input.semesterCode
      ? semesterRepository.findSemesterByCode(adminClient, input.semesterCode)
      : null,
  ]);

  const lookupError = nameResult?.error ?? codeResult?.error;
  if (lookupError) {
    return { success: false, error: mapCreateSemesterError(lookupError.message) };
  }

  const fieldErrors: FieldErrors = {};

  if (nameResult?.data && nameResult.data.id !== input.excludeSemesterId) {
    fieldErrors.name = [SEMESTER_NAME_TAKEN_MESSAGE];
  }

  if (codeResult?.data && codeResult.data.id !== input.excludeSemesterId) {
    fieldErrors.semester_code = [SEMESTER_CODE_TAKEN_MESSAGE];
  }

  return {
    success: true,
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : null,
  };
}

function mapCreateSemesterError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("semester_code")) {
    return "Unable to allocate a unique semester code. Please try again.";
  }

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A semester with this name already exists.";
  }

  return "Unable to create semester. Please try again.";
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

function buildCountMap(rows: Array<{ class_id: string }> | null | undefined) {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }

  return counts;
}

async function mapClassRecordsToSemesterClassRows(
  adminClient: Supabase,
  records: ClassWithSubjectRecord[]
): Promise<ManagerSemesterClassRow[]> {
  if (!records.length) {
    return [];
  }

  const classIds = records.map((record) => record.id);

  const [enrollmentResult, sessionResult] = await Promise.all([
    studentClassRepository.listStudentClassCountsByClassIds(
      adminClient,
      classIds
    ),
    sessionRepository.listSessionCountsByClassIds(adminClient, classIds),
  ]);

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  const enrollmentCounts = buildCountMap(enrollmentResult.data);
  const sessionCounts = buildCountMap(sessionResult.data);

  return records.map((record) => ({
    id: record.id,
    subject_id: record.subject_id ?? "",
    subject_name: record.subjects?.name ?? "—",
    subject_nb_sessions: record.subjects?.nb_sessions ?? 0,
    completed_sessions: sessionCounts.get(record.id) ?? 0,
    name: record.name,
    status: mapClassStatus(record.status),
    semester_id: record.semester_id,
    image_url: record.image_url,
    enrollment_count: enrollmentCounts.get(record.id) ?? 0,
    created_at: record.created_at ?? "",
  }));
}

function mapPaymentPhaseRecordToSemesterRow(
  record: PaymentPhaseListRecord
): ManagerSemesterPaymentPhaseRow {
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    amount: Number(record.amount),
    semester_code: record.semester_code,
    start_date: record.start_date,
    end_date: record.end_date,
  };
}

export async function listSemestersForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSemesterRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

  const { data, error } = await semesterRepository.listSemesters(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSemesterRecordToRow);
}

export async function getSemesterForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  semesterId: string
): Promise<ManagerSemesterRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

  const { data, error } = await semesterRepository.findSemesterById(
    adminClient,
    semesterId
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapSemesterRecordToRow(data);
}

export async function createSemesterForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    /** Blank or omitted → a unique code is generated. */
    semester_code?: string;
  }
): Promise<CreateSemesterResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SEMESTERS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createPhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedName = parsed.data.name.trim();
  const requestedCode = parsed.data.semester_code?.trim() || null;

  const conflicts = await findSemesterConflicts(adminClient, {
    name: normalizedName,
    semesterCode: requestedCode,
  });

  if (!conflicts.success) {
    return { success: false, error: conflicts.error };
  }

  if (conflicts.fieldErrors) {
    return {
      success: false,
      error: FORM_ERROR_MESSAGE,
      fieldErrors: conflicts.fieldErrors,
    };
  }

  let semesterCode = requestedCode;

  if (!semesterCode) {
    const codeAllocation = await allocateUniqueSemesterCode(adminClient);

    if (!codeAllocation.success) {
      return { success: false, error: codeAllocation.error };
    }

    semesterCode = codeAllocation.semesterCode;
  }

  const { data, error } = await semesterRepository.createSemester(adminClient, {
    name: normalizedName,
    semester_code: semesterCode,
  });

  if (error || !data) {
    if (requestedCode && isSemesterCodeConflictError(error?.message)) {
      return semesterCodeTakenFailure();
    }

    return {
      success: false,
      error: mapCreateSemesterError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "semesters",
    record_id: data.id,
    new_data: {
      name: data.name,
      semester_code: data.semester_code,
    },
    metadata: { note: "Semester created." },
  });

  return {
    success: true,
    semester: mapSemesterRecordToRow(data),
    message: "Semester created.",
  };
}

export async function updateSemesterForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    semester_code: string;
  }
): Promise<UpdateSemesterResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.SEMESTERS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updatePhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedName = parsed.data.name.trim();
  const nextCode = parsed.data.semester_code.trim();

  const existing = await semesterRepository.findSemesterById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapCreateSemesterError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Semester not found." };
  }

  const isNameChanged = normalizedName !== existing.data.name.trim();
  const isCodeChanged = nextCode !== existing.data.semester_code;

  const conflicts = await findSemesterConflicts(adminClient, {
    name: isNameChanged ? normalizedName : null,
    semesterCode: isCodeChanged ? nextCode : null,
    excludeSemesterId: parsed.data.id,
  });

  if (!conflicts.success) {
    return { success: false, error: conflicts.error };
  }

  if (conflicts.fieldErrors) {
    return {
      success: false,
      error: FORM_ERROR_MESSAGE,
      fieldErrors: conflicts.fieldErrors,
    };
  }

  const { data, error } = await semesterRepository.updateSemester(
    adminClient,
    parsed.data.id,
    {
      name: normalizedName,
      semester_code: nextCode,
    }
  );

  if (error || !data) {
    if (isCodeChanged && isSemesterCodeConflictError(error?.message)) {
      return semesterCodeTakenFailure();
    }

    return {
      success: false,
      error: mapCreateSemesterError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "semesters",
    record_id: data.id,
    old_data: {
      name: existing.data.name,
      semester_code: existing.data.semester_code,
    },
    new_data: {
      name: data.name,
      semester_code: data.semester_code,
    },
    metadata: {
      note: "Semester updated.",
      changed_fields: [
        ...(isNameChanged ? ["name"] : []),
        ...(isCodeChanged ? ["semester_code"] : []),
      ],
    },
  });

  return {
    success: true,
    semester: mapSemesterRecordToRow(data),
    message: "Semester updated.",
  };
}

export async function listSemesterClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  semesterId: string
): Promise<ManagerSemesterClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

  const { data, error } =
    await classRepository.listClassesWithSubjectBySemesterId(
      adminClient,
      semesterId
    );

  if (error) {
    throw new Error(error.message);
  }

  return mapClassRecordsToSemesterClassRows(adminClient, data ?? []);
}

export async function listSemesterPaymentPhasesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  semesterId: string
): Promise<ManagerSemesterPaymentPhaseRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

  const { data, error } =
    await paymentPhaseRepository.listPaymentPhasesBySemesterId(
      adminClient,
      semesterId
    );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PaymentPhaseListRecord[]).map(
    mapPaymentPhaseRecordToSemesterRow
  );
}
