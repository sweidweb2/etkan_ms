import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/authorization.service";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import {
  SEMESTER_STATUSES,
  SEMESTER_STATUS_VALUES,
  type SemesterStatusValue,
} from "@/lib/constants/manager-semester-status";
import { createPhaseSchema } from "@/lib/validators/manager/create-phase";
import { updatePhaseSchema } from "@/lib/validators/manager/update-phase";
import { connectSemesterClassSchema } from "@/lib/validators/manager/connect-semester-class";
import { generateSemesterCode } from "@/lib/manager/generate-semester-code";
import * as classRepository from "@/repositories/class.repository";
import type { ClassWithSubjectRecord } from "@/repositories/class.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import type { SemesterRecord } from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerSemesterProgressRow,
  ManagerSemesterRow,
} from "@/types/manager-phase";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";
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

export type ConnectSemesterClassSuccess = {
  success: true;
  classRow: ManagerSemesterClassRow;
  semester: ManagerSemesterRow;
  message: string;
};

export type ConnectSemesterClassFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ConnectSemesterClassResult =
  | ConnectSemesterClassSuccess
  | ConnectSemesterClassFailure;

function mapSemesterStatus(status: string | null | undefined): SemesterStatusValue {
  if (
    status &&
    SEMESTER_STATUS_VALUES.includes(status as SemesterStatusValue)
  ) {
    return status as SemesterStatusValue;
  }

  return SEMESTER_STATUSES.SCHEDULED;
}

function mapSemesterRecordToRow(record: SemesterRecord): ManagerSemesterRow {
  return {
    id: record.id,
    name: record.name,
    nb_courses: record.nb_courses,
    amount: Number(record.amount),
    status: mapSemesterStatus(record.status),
    start_date: record.start_date ?? null,
    semester_code: record.semester_code,
    created_at: record.created_at ?? "",
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
    enrollment_count: enrollmentCounts.get(record.id) ?? 0,
    created_at: record.created_at ?? "",
  }));
}

function mapConnectSemesterClassError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("foreign key")) {
    return "Class or semester not found.";
  }

  return "Unable to connect class. Please try again.";
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

export async function listSemesterProgressForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSemesterProgressRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_VIEW);

  const [semestersResult, classesResult] = await Promise.all([
    semesterRepository.listSemesters(adminClient),
    classRepository.listLinkedClassesWithSubject(adminClient),
  ]);

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const classRows = await mapClassRecordsToSemesterClassRows(
    adminClient,
    classesResult.data ?? []
  );

  const classesBySemesterId = new Map<string, ManagerSemesterClassRow[]>();

  for (const classRow of classRows) {
    if (!classRow.semester_id) {
      continue;
    }

    const existing = classesBySemesterId.get(classRow.semester_id) ?? [];
    existing.push(classRow);
    classesBySemesterId.set(classRow.semester_id, existing);
  }

  return (semestersResult.data ?? []).map((record) => {
    const semester = mapSemesterRecordToRow(record);

    return {
      semester,
      classes: classesBySemesterId.get(semester.id) ?? [],
    };
  });
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
    nb_courses: number;
    amount: number;
    status: string;
    start_date?: string | null;
  }
): Promise<CreateSemesterResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SEMESTERS_CREATE);
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

  const { name, nb_courses, amount, status, start_date } = parsed.data;
  const normalizedName = name.trim();

  const existing = await semesterRepository.findSemesterByName(
    adminClient,
    normalizedName
  );

  if (existing.error) {
    return {
      success: false,
      error: mapCreateSemesterError(existing.error.message),
    };
  }

  if (existing.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A semester with this name already exists."] },
    };
  }

  const codeAllocation = await allocateUniqueSemesterCode(adminClient);

  if (!codeAllocation.success) {
    return { success: false, error: codeAllocation.error };
  }

  const { data, error } = await semesterRepository.createSemester(adminClient, {
    name: normalizedName,
    nb_courses,
    amount,
    status,
    start_date,
    semester_code: codeAllocation.semesterCode,
  });

  if (error || !data) {
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
      nb_courses: data.nb_courses,
      amount: data.amount,
      status: data.status,
      start_date: data.start_date,
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
    nb_courses: number;
    amount: number;
    status: string;
    start_date?: string | null;
  }
): Promise<UpdateSemesterResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SEMESTERS_UPDATE);
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

  const normalizedName = parsed.data.name.trim();
  const nameConflict = await semesterRepository.findSemesterByName(
    adminClient,
    normalizedName
  );

  if (nameConflict.error) {
    return {
      success: false,
      error: mapCreateSemesterError(nameConflict.error.message),
    };
  }

  if (nameConflict.data && nameConflict.data.id !== parsed.data.id) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { name: ["A semester with this name already exists."] },
    };
  }

  const { data, error } = await semesterRepository.updateSemester(
    adminClient,
    parsed.data.id,
    {
      name: normalizedName,
      nb_courses: parsed.data.nb_courses,
      amount: parsed.data.amount,
      status: parsed.data.status,
      start_date: parsed.data.start_date,
    }
  );

  if (error || !data) {
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
      nb_courses: existing.data.nb_courses,
      amount: existing.data.amount,
      status: existing.data.status,
      start_date: existing.data.start_date,
      semester_code: existing.data.semester_code,
    },
    new_data: {
      name: data.name,
      nb_courses: data.nb_courses,
      amount: data.amount,
      status: data.status,
      start_date: data.start_date,
      semester_code: data.semester_code,
    },
    metadata: {
      note: "Semester updated.",
      changed_fields: ["name", "nb_courses", "amount", "status", "start_date"],
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

export async function listUnlinkedClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerSemesterClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SEMESTERS_CONNECT_CLASS);

  const { data, error } =
    await classRepository.listUnlinkedClassesWithSubject(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return mapClassRecordsToSemesterClassRows(adminClient, data ?? []);
}

export async function connectClassToSemesterForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    semester_id: string;
    classId: string;
  }
): Promise<ConnectSemesterClassResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SEMESTERS_CONNECT_CLASS);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = connectSemesterClassSchema.safeParse({
    classId: input.classId,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const semesterResult = await semesterRepository.findSemesterById(
    adminClient,
    input.semester_id
  );

  if (semesterResult.error) {
    return {
      success: false,
      error: mapConnectSemesterClassError(semesterResult.error.message),
    };
  }

  if (!semesterResult.data) {
    return { success: false, error: "Semester not found." };
  }

  const existingClass = await classRepository.findClassById(
    adminClient,
    parsed.data.classId
  );

  if (existingClass.error) {
    return {
      success: false,
      error: mapConnectSemesterClassError(existingClass.error.message),
    };
  }

  if (!existingClass.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { classId: ["Class not found."] },
    };
  }

  if (existingClass.data.semester_id) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        classId: ["This class is already linked to a semester."],
      },
    };
  }

  const { data, error } = await classRepository.updateClassSemesterId(
    adminClient,
    parsed.data.classId,
    input.semester_id
  );

  if (error || !data) {
    return {
      success: false,
      error: mapConnectSemesterClassError(error?.message ?? "Unknown error"),
    };
  }

  const [classRows, classCountResult] = await Promise.all([
    mapClassRecordsToSemesterClassRows(adminClient, [data]),
    classRepository.countClassesBySemesterId(adminClient, input.semester_id),
  ]);

  if (classCountResult.error) {
    return {
      success: false,
      error: mapConnectSemesterClassError(classCountResult.error.message),
    };
  }

  const nbCourses = classCountResult.count ?? 0;
  const updatedSemester = await semesterRepository.updateSemesterNbCourses(
    adminClient,
    input.semester_id,
    nbCourses
  );

  if (updatedSemester.error || !updatedSemester.data) {
    return {
      success: false,
      error: mapConnectSemesterClassError(
        updatedSemester.error?.message ?? "Unknown error"
      ),
    };
  }

  const classRow = classRows[0];

  if (!classRow) {
    return { success: false, error: "Unable to load connected class." };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "classes",
    record_id: data.id,
    old_data: { semester_id: existingClass.data.semester_id },
    new_data: { semester_id: data.semester_id },
    metadata: {
      note: "Class connected to semester.",
      semester_id: input.semester_id,
      semester_name: semesterResult.data.name,
      changed_fields: ["semester_id"],
    },
  });

  return {
    success: true,
    classRow,
    semester: mapSemesterRecordToRow(updatedSemester.data),
    message: `${classRow.name} connected to ${semesterResult.data.name}.`,
  };
}
