import { PERMISSIONS } from "@/lib/constants/permissions";
import type { RoleValue } from "@/lib/constants/roles";
import {
  assertPermission,
  getUnauthorizedError,
  hasPermission,
} from "@/services/auth/authorization.service";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import {
  buildGradesByTaskId,
  computeOverallAverageTaskGrade,
  computeSessionTaskGradeSummary,
} from "@/lib/manager/class-analytics";
import { buildClassGroupGradeTrend } from "@/lib/manager/class-group-grade-analytics";
import {
  STUDENT_TASK_STATUSES,
  type StudentTaskStatusValue,
} from "@/lib/constants/manager-student-task-status";
import { updateClassSchema } from "@/lib/validators/manager/update-class";
import { createClassSchema } from "@/lib/validators/manager/create-class";
import { createClassSessionSchema } from "@/lib/validators/manager/create-class-session";
import { createFinalExamSchema } from "@/lib/validators/manager/create-final-exam";
import { createEditStudentFinalExamGradeSchema } from "@/lib/validators/manager/edit-student-finalexam-grade";
import { updateFinalExamSchema } from "@/lib/validators/manager/update-final-exam";
import {
  addStudentToClassSchema,
  addStudentsToClassSchema,
} from "@/lib/validators/manager/add-student-to-class";
import { removeStudentFromClassSchema } from "@/lib/validators/manager/remove-student-from-class";
import { transferStudentBetweenClassesSchema } from "@/lib/validators/manager/transfer-student-between-classes";
import { datetimeLocalToUtcIso } from "@/lib/utils/datetime-local-to-utc-iso";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import type {
  FinalExamRecord,
  StudentFinalExamGradeRecord,
} from "@/repositories/final-exam.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as taskRepository from "@/repositories/task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  backfillSppsForClassBecomeInProgress,
  onStudentJoinedClass,
  onStudentLeftClass,
  onStudentsJoinedClass,
  type StudentJoinSyncItem,
} from "@/services/accounting/accounting-sync.service";
import { isAttendeePresentForRate } from "@/lib/constants/manager-attendee-status";
import {
  CLASS_GRADES_LOCKED_ERROR,
  isClassGradesUnlocked,
} from "@/lib/manager/class-grades-access";
import {
  assertClassStructureUnlockedForComputedGrades,
  assertStudentGradeInputsUnlockedForComputedGrade,
} from "@/services/classes/class-computed-grade-lock.service";
import { ensureSessionAttendeesForMembers, seedLateJoinAttendeesForStudent, seedLateJoinAttendeesForStudents, seedLateJoinStudentTasksForStudent, seedLateJoinStudentTasksForStudents } from "@/services/classes/session.service";
import { listStudentsForManager } from "@/services/students/student.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherOption,
  ManagerClassTeacherSelectOption,
} from "@/types/manager-class-detail";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { z } from "zod";
import { assignClassTeacherSchema } from "@/lib/validators/manager/assign-class-teacher";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

const PAYMENT_SYNC_FAILURE_WARNING =
  "Payment sync failed. Check Accounting → Missing assignments.";

async function recordPaymentSyncFailure(
  adminClient: Supabase,
  actor: AuditActor,
  input: {
    studentId: string;
    classId: string;
    operation: string;
    error: unknown;
  }
) {
  const errorMessage =
    input.error instanceof Error ? input.error.message : "Unknown error";

  await recordManagerAuditLog(adminClient, actor, {
    action: "other",
    severity: "warning",
    table_name: "student_payment_phases",
    record_id: null,
    metadata: {
      note: "Payment sync failed; enrollment/status change was kept.",
      operation: input.operation,
      class_id: input.classId,
      student_id: input.studentId,
      error: errorMessage,
    },
  });
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

function mapFinalExamStatus(status: string): StudentTaskStatusValue {
  if (
    status === STUDENT_TASK_STATUSES.PENDING ||
    status === STUDENT_TASK_STATUSES.SUBMITTED ||
    status === STUDENT_TASK_STATUSES.GRADED ||
    status === STUDENT_TASK_STATUSES.LATE ||
    status === STUDENT_TASK_STATUSES.MISSING
  ) {
    return status;
  }

  return STUDENT_TASK_STATUSES.PENDING;
}

function mapGroupGradeLevel(
  value: string | null
): SessionGroupGradeLevelValue | null {
  if (
    value === "very_low" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "very_high"
  ) {
    return value;
  }

  return null;
}

function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toIsoOrNull(value?: string | null): string | null {
  return datetimeLocalToUtcIso(value);
}

function mapSessionRecord(record: SessionRecord): ManagerClassSessionRow {
  return {
    id: record.id,
    class_id: record.class_id,
    nb_order: record.nb_order,
    topic: record.topic,
    starts_at: record.starts_at,
    ends_at: record.ends_at,
    semester_id: record.semester_id,
    group_grade_level: mapGroupGradeLevel(record.group_grade_level),
    created_at: record.created_at,
  };
}

function mapFinalExamRecord(record: FinalExamRecord): ManagerClassFinalExamRow {
  return {
    id: record.id,
    class_id: record.class_id,
    title: record.title,
    description: record.description,
    due_date: record.due_date,
    max_grade: record.max_grade === null ? null : Number(record.max_grade),
    created_at: record.created_at,
  };
}

function mapStudentFinalExamGradeRecord(
  record: StudentFinalExamGradeRecord,
  fullName: string
): ManagerStudentFinalExamGradeRow {
  return {
    id: record.id,
    final_exam_id: record.final_exam_id,
    student_id: record.student_id,
    full_name: fullName,
    status: mapFinalExamStatus(record.status),
    submitted_at: record.submitted_at,
    grade: record.grade === null ? null : Number(record.grade),
    notes: record.notes,
    graded_at: record.graded_at,
    created_at: record.created_at,
  };
}

function mapClassDetailRecordToRow(
  record: ClassDetailRecord,
  counts: {
    enrollment_count: number;
    teacher_count: number;
    completed_sessions: number;
  }
): ManagerClassRow {
  return {
    id: record.id,
    name: record.name,
    subject_id: record.subject_id ?? "",
    subject_name: record.subjects?.name ?? "—",
    subject_nb_sessions: record.subjects?.nb_sessions ?? 0,
    completed_sessions: counts.completed_sessions,
    status: mapClassStatus(record.status),
    semester_id: record.semester_id,
    semester_name: record.semesters?.name ?? null,
    enrollment_count: counts.enrollment_count,
    teacher_count: counts.teacher_count,
    created_at: record.created_at ?? "",
  };
}

async function loadClassDetailCounts(
  adminClient: Supabase,
  classId: string
): Promise<{
  enrollment_count: number;
  teacher_count: number;
  completed_sessions: number;
}> {
  const [enrollmentResult, teacherResult, sessionResult] = await Promise.all([
    studentClassRepository.countStudentClassesByClassId(adminClient, classId),
    classTeacherRepository.countClassTeachersByClassId(adminClient, classId),
    sessionRepository.listSessionCountsByClassIds(adminClient, [classId]),
  ]);

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (teacherResult.error) {
    throw new Error(teacherResult.error.message);
  }

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  return {
    enrollment_count: enrollmentResult.count ?? 0,
    teacher_count: teacherResult.count ?? 0,
    completed_sessions: sessionResult.data?.length ?? 0,
  };
}

async function mapClassDetailToRow(
  adminClient: Supabase,
  record: ClassDetailRecord
): Promise<ManagerClassRow> {
  const counts = await loadClassDetailCounts(adminClient, record.id);
  return mapClassDetailRecordToRow(record, counts);
}

function mapClassDetailToRowWithCounts(
  record: ClassDetailRecord,
  counts: {
    enrollment_count: number;
    teacher_count: number;
    completed_sessions: number;
  }
): ManagerClassRow {
  return mapClassDetailRecordToRow(record, counts);
}

function buildCountMap(rows: Array<{ class_id: string }> | null | undefined) {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }

  return counts;
}

async function mapClassDetailRecordsToRows(
  adminClient: Supabase,
  records: ClassDetailRecord[]
): Promise<ManagerClassRow[]> {
  if (records.length === 0) {
    return [];
  }

  const classIds = records.map((record) => record.id);

  const [enrollmentResult, teacherResult, sessionResult] = await Promise.all([
    studentClassRepository.listStudentClassCountsByClassIds(
      adminClient,
      classIds
    ),
    classTeacherRepository.listClassTeacherCountsByClassIds(
      adminClient,
      classIds
    ),
    sessionRepository.listSessionCountsByClassIds(adminClient, classIds),
  ]);

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (teacherResult.error) {
    throw new Error(teacherResult.error.message);
  }

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  const enrollmentCounts = buildCountMap(enrollmentResult.data);
  const teacherCounts = buildCountMap(teacherResult.data);
  const sessionCounts = buildCountMap(sessionResult.data);

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    subject_id: record.subject_id ?? "",
    subject_name: record.subjects?.name ?? "—",
    subject_nb_sessions: record.subjects?.nb_sessions ?? 0,
    completed_sessions: sessionCounts.get(record.id) ?? 0,
    status: mapClassStatus(record.status),
    semester_id: record.semester_id,
    semester_name: record.semesters?.name ?? null,
    enrollment_count: enrollmentCounts.get(record.id) ?? 0,
    teacher_count: teacherCounts.get(record.id) ?? 0,
    created_at: record.created_at ?? "",
  }));
}

async function syncSemesterNbCourses(
  adminClient: Supabase,
  semesterId: string | null
): Promise<void> {
  if (!semesterId) {
    return;
  }

  const countResult = await classRepository.countClassesBySemesterId(
    adminClient,
    semesterId
  );

  if (countResult.error) {
    throw new Error(countResult.error.message);
  }

  const updateResult = await semesterRepository.updateSemesterNbCourses(
    adminClient,
    semesterId,
    countResult.count ?? 0
  );

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }
}

async function buildFullNameByUserId(
  adminClient: Supabase,
  userIds: string[]
): Promise<Map<string, string>> {
  const { data, error } =
    await studentProfileRepository.listStudentProfilesByUserIds(
      adminClient,
      userIds
    );

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.user_id, row.full_name);
  }
  return map;
}

function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

function isInvalidUuidError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid input syntax for type uuid") ||
    normalized.includes("22p02")
  );
}

export async function listClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const { data, error } = await classRepository.listClassDetails(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return mapClassDetailRecordsToRows(
    adminClient,
    (data ?? []) as ClassDetailRecord[]
  );
}

export type ManagerClassCreateDialogData = {
  subjects: ManagerClassSubjectOption[];
  semesters: ManagerClassSemesterOption[];
  teachers: ManagerClassTeacherSelectOption[];
};

export async function getClassCreateDialogDataForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassCreateDialogData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_CREATE);

  const [subjectsResult, semestersResult, teachersResult] = await Promise.all([
    subjectRepository.listSubjects(adminClient),
    semesterRepository.listSemesters(adminClient),
    profileRepository.listProfiles(adminClient),
  ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  return {
    subjects: (subjectsResult.data ?? []).map((subject) => ({
      id: subject.id,
      name: subject.name,
      nb_sessions: subject.nb_sessions,
    })),
    semesters: (semestersResult.data ?? []).map((semester) => ({
      id: semester.id,
      name: semester.name,
    })),
    teachers: (teachersResult.data ?? []).map((teacher) => ({
      id: teacher.id,
      username: teacher.username,
      role: teacher.role as RoleValue,
    })),
  };
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
  }
): Promise<CreateClassResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createClassSchema.safeParse({
    name: input.name,
    subject_id: input.subject_id,
    status: input.status,
    semester_id: input.semester_id ?? "",
    teacher_id: input.teacher_id ?? "",
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
  }

  const { data, error } = await classRepository.createClass(adminClient, {
    name: parsed.data.name.trim(),
    subject_id: parsed.data.subject_id,
    status: parsed.data.status,
    semester_id: nextSemesterId,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to create class. Please try again.",
    };
  }

  if (nextSemesterId) {
    await syncSemesterNbCourses(adminClient, nextSemesterId);
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

  const classRow = mapClassDetailToRowWithCounts(data as ClassDetailRecord, {
    enrollment_count: 0,
    teacher_count: nextTeacherId ? 1 : 0,
    completed_sessions: 0,
  });

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
    },
  });

  return {
    success: true,
    classRow,
    message: "Class created.",
  };
}

export async function getClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  if (!isUuid(classId)) {
    return null;
  }

  const { data, error } = await classRepository.findClassDetailById(
    adminClient,
    classId
  );

  if (error) {
    if (isInvalidUuidError(error.message)) {
      return null;
    }

    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapClassDetailToRow(adminClient, data as ClassDetailRecord);
}

export async function assertClassGradesUnlockedForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<
  | { ok: true; classRow: ManagerClassRow }
  | { ok: false; error: string }
> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  if (!isUuid(classId)) {
    return { ok: false, error: "Class not found." };
  }

  const [classResult, counts] = await Promise.all([
    classRepository.findClassDetailById(adminClient, classId),
    loadClassDetailCounts(adminClient, classId),
  ]);

  if (classResult.error) {
    if (isInvalidUuidError(classResult.error.message)) {
      return { ok: false, error: "Class not found." };
    }

    throw new Error(classResult.error.message);
  }

  if (!classResult.data) {
    return { ok: false, error: "Class not found." };
  }

  const classRow = mapClassDetailRecordToRow(
    classResult.data as ClassDetailRecord,
    counts
  );

  if (!isClassGradesUnlocked(classRow.status)) {
    return { ok: false, error: CLASS_GRADES_LOCKED_ERROR };
  }

  return { ok: true, classRow };
}

export async function listTeacherOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassTeacherSelectOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const teachersResult = await profileRepository.listProfiles(adminClient);

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  return (teachersResult.data ?? []).map((teacher) => ({
    id: teacher.id,
    username: teacher.username,
    role: teacher.role as RoleValue,
  }));
}

export async function listClassTeacherOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  if (!isUuid(classId)) {
    return [];
  }

  const [teachers, assignmentsResult] = await Promise.all([
    listTeacherOptionsForManager(adminClient, actorUserId),
    classTeacherRepository.listClassTeachersByClassId(adminClient, classId),
  ]);

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignmentByTeacherId = new Map(
    (assignmentsResult.data ?? []).map((row) => [row.teacher_id, row.id])
  );

  return teachers.map((teacher) => ({
    id: teacher.id,
    username: teacher.username,
    role: teacher.role,
    assigned: assignmentByTeacherId.has(teacher.id),
    assignment_id: assignmentByTeacherId.get(teacher.id) ?? null,
  }));
}

export type AssignClassTeacherResult =
  | {
      success: true;
      teacher: ManagerClassTeacherOption;
      classRow: ManagerClassRow;
      message: string;
    }
  | MutationFailure;

export async function assignTeacherToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string; teacher_id: string }
): Promise<AssignClassTeacherResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_ASSIGN_TEACHER);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignClassTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [classResult, teacherResult, counts] = await Promise.all([
    classRepository.findClassDetailById(adminClient, parsed.data.class_id),
    profileRepository.findProfileById(adminClient, parsed.data.teacher_id),
    loadClassDetailCounts(adminClient, parsed.data.class_id),
  ]);

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

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

  const existing = await classTeacherRepository.findClassTeacherByTeacherAndClass(
    adminClient,
    parsed.data.teacher_id,
    parsed.data.class_id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (existing.data) {
    return {
      success: false,
      error: "This teacher is already assigned to the class.",
    };
  }

  const { data, error } = await classTeacherRepository.createClassTeacher(
    adminClient,
    {
      teacher_id: parsed.data.teacher_id,
      class_id: parsed.data.class_id,
      assigned_by: actor.userId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to assign teacher.",
    };
  }

  const classRow = mapClassDetailToRowWithCounts(
    classResult.data as ClassDetailRecord,
    {
      ...counts,
      teacher_count: counts.teacher_count + 1,
    }
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    table_name: "class_teacher",
    record_id: data.id,
    new_data: {
      class_id: data.class_id,
      teacher_id: data.teacher_id,
    },
  });

  return {
    success: true,
    teacher: {
      id: teacherResult.data.id,
      username: teacherResult.data.username,
      role: teacherResult.data.role as RoleValue,
      assigned: true,
      assignment_id: data.id,
    },
    classRow,
    message: "Teacher assigned to class.",
  };
}

export type UnassignClassTeacherResult =
  | {
      success: true;
      teacherId: string;
      classRow: ManagerClassRow;
      message: string;
    }
  | MutationFailure;

export async function unassignTeacherFromClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string; teacher_id: string }
): Promise<UnassignClassTeacherResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_UNASSIGN_TEACHER);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignClassTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [classResult, counts, existing] = await Promise.all([
    classRepository.findClassDetailById(adminClient, parsed.data.class_id),
    loadClassDetailCounts(adminClient, parsed.data.class_id),
    classTeacherRepository.findClassTeacherByTeacherAndClass(
      adminClient,
      parsed.data.teacher_id,
      parsed.data.class_id
    ),
  ]);

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Teacher is not assigned to this class." };
  }

  const { error } = await classTeacherRepository.deleteClassTeacherById(
    adminClient,
    existing.data.id
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const classRow = mapClassDetailToRowWithCounts(
    classResult.data as ClassDetailRecord,
    {
      ...counts,
      teacher_count: Math.max(0, counts.teacher_count - 1),
    }
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    table_name: "class_teacher",
    record_id: existing.data.id,
    old_data: {
      class_id: existing.data.class_id,
      teacher_id: existing.data.teacher_id,
    },
  });

  return {
    success: true,
    teacherId: parsed.data.teacher_id,
    classRow,
    message: "Teacher removed from class.",
  };
}

export async function listClassSessionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassSessionRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.SESSIONS_VIEW);

  const { data, error } = await sessionRepository.listSessionsByClassId(
    adminClient,
    classId
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapSessionRecord(row as SessionRecord));
}

export async function listClassStudentsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassStudentRow[]> {
  const timer = createNavStepTimer("class_students");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW)
    );

    const { data: enrollments, error } = await timer.step("enrollments", () =>
      studentClassRepository.listStudentClassesByClassId(adminClient, classId)
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!enrollments?.length) {
      return [];
    }

    const userIds = enrollments.map((row) => row.user_id);

    const [profilesResult, studentProfilesResult, emailResult] =
      await timer.step("profiles", () =>
        Promise.all([
          profileRepository.listProfilesByIds(adminClient, userIds),
          studentProfileRepository.listStudentProfileDetailsByUserIds(
            adminClient,
            userIds
          ),
          authRepository.listAuthEmailsByIds(adminClient, userIds),
        ])
      );

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    if (studentProfilesResult.error) {
      throw new Error(studentProfilesResult.error.message);
    }

    if (emailResult.error) {
      throw new Error(emailResult.error.message);
    }

    const profileById = new Map(
      (profilesResult.data ?? []).map((row) => [row.id, row])
    );
    const studentProfileByUserId = new Map(
      (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
    );
    const emailById = emailResult.data;
    const rows: ManagerClassStudentRow[] = [];

    for (const enrollment of enrollments) {
      const studentProfile = studentProfileByUserId.get(enrollment.user_id);
      const profile = profileById.get(enrollment.user_id);

      if (!studentProfile || !profile) {
        continue;
      }

      rows.push({
        id: enrollment.id,
        student_profile_id: studentProfile.id,
        user_id: enrollment.user_id,
        full_name: studentProfile.full_name,
        username: profile.username,
        email: emailById.get(enrollment.user_id) ?? "",
        phone: studentProfile.phone,
        joined_at: enrollment.joined_at ?? "",
      });
    }

    return rows;
  } finally {
    timer.end();
  }
}

export async function fetchClassStudentRowForManager(
  adminClient: Supabase,
  classId: string,
  userId: string
): Promise<ManagerClassStudentRow | null> {
  const { data: enrollment, error } =
    await studentClassRepository.findStudentClassByUserAndClass(
      adminClient,
      userId,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!enrollment) {
    return null;
  }

  const [profilesResult, studentProfilesResult, emailResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, [userId]),
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      [userId]
    ),
    authRepository.listAuthEmailsByIds(adminClient, [userId]),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const studentProfile = studentProfilesResult.data?.[0];
  const profile = profilesResult.data?.[0];

  if (!studentProfile || !profile) {
    return null;
  }

  return {
    id: enrollment.id,
    student_profile_id: studentProfile.id,
    user_id: enrollment.user_id,
    full_name: studentProfile.full_name,
    username: profile.username,
    email: emailResult.data.get(userId) ?? "",
    phone: studentProfile.phone,
    joined_at: enrollment.joined_at ?? "",
  };
}

export async function listAvailableStudentsForClass(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerStudentRow[]> {
  const timer = createNavStepTimer("loadAvailableStudents");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_ADD_STUDENT)
    );

    const [membershipResult, students] = await Promise.all([
      timer.step("members", () =>
        studentClassRepository.listStudentUserIdsByClassId(adminClient, classId)
      ),
      timer.step("students", () =>
        listStudentsForManager(adminClient, actorUserId)
      ),
    ]);

    if (membershipResult.error) {
      throw new Error(membershipResult.error.message);
    }

    const memberIds = new Set(
      (membershipResult.data ?? []).map((row) => row.user_id)
    );

    return students.filter(
      (student) =>
        !memberIds.has(student.user_id) &&
        student.status !== STUDENT_STATUSES.INACTIVE
    );
  } finally {
    timer.end();
  }
}

export async function getClassFinalExamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  finalExam: ManagerClassFinalExamRow | null;
  studentGrades: ManagerStudentFinalExamGradeRow[];
}> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_VIEW);

  const { data: exam, error } = await finalExamRepository.findFinalExamByClassId(
    adminClient,
    classId
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!exam) {
    return { finalExam: null, studentGrades: [] };
  }

  const { data: grades, error: gradesError } =
    await finalExamRepository.listStudentFinalExamGradesByFinalExamId(
      adminClient,
      exam.id
    );

  if (gradesError) {
    throw new Error(gradesError.message);
  }

  const gradeRecords = (grades ?? []) as StudentFinalExamGradeRecord[];
  const nameByUserId = await buildFullNameByUserId(
    adminClient,
    gradeRecords.map((row) => row.student_id)
  );

  return {
    finalExam: mapFinalExamRecord(exam as FinalExamRecord),
    studentGrades: gradeRecords.map((row) =>
      mapStudentFinalExamGradeRecord(
        row,
        nameByUserId.get(row.student_id) ?? "Unknown student"
      )
    ),
  };
}

export async function getClassAnalyticsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassAnalyticsPreview> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW_ANALYTICS);

  const [sessionsResult, enrollmentResult] = await Promise.all([
    sessionRepository.listSessionsByClassId(adminClient, classId),
    studentClassRepository.countStudentClassesByClassId(adminClient, classId),
  ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  const sessions = (sessionsResult.data ?? []) as SessionRecord[];
  const enrolledCount = enrollmentResult.count ?? 0;

  if (sessions.length === 0) {
    return {
      taskGradeTrend: [],
      groupGradeTrend: [],
      attendanceTrend: [],
      overallAverageTaskGrade: 0,
      overallAttendanceRate: 0,
    };
  }

  const sessionIds = sessions.map((session) => session.id);

  const [tasksResult, attendeesResult] = await Promise.all([
    taskRepository.listTasksBySessionIds(adminClient, sessionIds),
    attendeeRepository.listAttendeesBySessionIds(adminClient, sessionIds),
  ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  if (attendeesResult.error) {
    throw new Error(attendeesResult.error.message);
  }

  const tasks = tasksResult.data ?? [];
  const taskIds = tasks.map((task) => task.id);
  const studentTasksResult = await studentTaskRepository.listStudentTasksByTaskIds(
    adminClient,
    taskIds
  );

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  const studentTasks = studentTasksResult.data ?? [];
  const tasksBySessionId = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.session_id) {
      continue;
    }
    const list = tasksBySessionId.get(task.session_id) ?? [];
    list.push(task);
    tasksBySessionId.set(task.session_id, list);
  }

  const gradesByTaskId = buildGradesByTaskId(studentTasks);

  const attendeesBySessionId = new Map<
    string,
    Array<{ student_id: string; status: string }>
  >();
  for (const row of attendeesResult.data ?? []) {
    const list = attendeesBySessionId.get(row.session_id) ?? [];
    list.push({ student_id: row.student_id, status: row.status });
    attendeesBySessionId.set(row.session_id, list);
  }

  const taskGradeTrend = sessions.map((session) => {
    const sessionTasks = tasksBySessionId.get(session.id) ?? [];
    const summary = computeSessionTaskGradeSummary(sessionTasks, gradesByTaskId);

    return {
      session_label: `S${session.nb_order}`,
      nb_order: session.nb_order,
      average_grade: summary.average_grade,
      task_count: summary.task_count,
      graded_count: summary.graded_count,
    };
  });

  const groupGradeTrend = buildClassGroupGradeTrend(sessions);

  const attendanceTrend = sessions.map((session) => {
    const attendees = attendeesBySessionId.get(session.id) ?? [];
    const presentCount = attendees.filter((row) =>
      isAttendeePresentForRate(row.status)
    ).length;
    const denominator = enrolledCount > 0 ? enrolledCount : attendees.length;
    const rate =
      denominator === 0
        ? 0
        : Math.round((presentCount / denominator) * 1000) / 10;

    return {
      session_label: `S${session.nb_order}`,
      nb_order: session.nb_order,
      attendance_rate: rate,
      present_count: presentCount,
      enrolled_count: enrolledCount,
    };
  });

  const overallAverageTaskGrade = computeOverallAverageTaskGrade(taskGradeTrend);

  const overallAttendanceRate =
    attendanceTrend.length === 0
      ? 0
      : Math.round(
          (attendanceTrend.reduce(
            (sum, point) => sum + point.attendance_rate,
            0
          ) /
            attendanceTrend.length) *
            10
        ) / 10;

  return {
    taskGradeTrend,
    groupGradeTrend,
    attendanceTrend,
    overallAverageTaskGrade,
    overallAttendanceRate,
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
  }
): Promise<UpdateClassResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.CLASSES_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateClassSchema.safeParse({
    name: input.name,
    subject_id: input.subject_id,
    status: input.status,
    semester_id: input.semester_id ?? "",
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

  const previousSemesterId = existing.data.semester_id;

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

  if (previousSemesterId !== nextSemesterId) {
    await Promise.all([
      syncSemesterNbCourses(adminClient, previousSemesterId),
      syncSemesterNbCourses(adminClient, nextSemesterId),
    ]);
  }

  const classRow = mapClassDetailToRowWithCounts(
    data as ClassDetailRecord,
    counts
  );

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
    },
  });

  return {
    success: true,
    classRow,
    message: "Class updated.",
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
    try {
      await backfillSppsForClassBecomeInProgress(
        adminClient,
        input.class_id,
        actor
      );
    } catch (syncError) {
      await recordPaymentSyncFailure(adminClient, actor, {
        studentId: "",
        classId: input.class_id,
        operation: "class_status_in_progress_backfill",
        error: syncError,
      });
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }
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
    starts_at: string;
    ends_at: string;
  }
): Promise<CreateClassSessionResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.SESSIONS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createClassSessionSchema.safeParse({
    topic: input.topic,
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
    starts_at: startsAt,
    ends_at: endsAt,
    semester_id: existing.data.semester_id,
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
    },
  });

  return {
    success: true,
    session,
    classRow,
    message: "Session created.",
  };
}

export type CreateFinalExamResult =
  | {
      success: true;
      finalExam: ManagerClassFinalExamRow;
      studentGrades: ManagerStudentFinalExamGradeRow[];
      message: string;
    }
  | MutationFailure;

export async function createFinalExamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<CreateFinalExamResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinalExamSchema.safeParse({
    title: input.title,
    description: input.description,
    due_date: input.due_date,
    max_grade: input.max_grade,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingClass, structureGuard, existingExam] = await Promise.all([
    classRepository.findClassById(adminClient, input.class_id),
    assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id),
    finalExamRepository.findFinalExamByClassId(adminClient, input.class_id),
  ]);

  if (existingClass.error) {
    return { success: false, error: existingClass.error.message };
  }

  if (!existingClass.data) {
    return { success: false, error: "Class not found." };
  }

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  if (existingExam.error) {
    return { success: false, error: existingExam.error.message };
  }

  if (existingExam.data) {
    return {
      success: false,
      error: "This class already has a final exam.",
    };
  }

  const maxGrade =
    parsed.data.max_grade === "" || parsed.data.max_grade === undefined
      ? null
      : Number(parsed.data.max_grade);

  const { data, error } = await finalExamRepository.createFinalExam(
    adminClient,
    {
      class_id: input.class_id,
      title: parsed.data.title.trim(),
      description: normalizeOptionalString(parsed.data.description),
      due_date: toIsoOrNull(parsed.data.due_date),
      max_grade: maxGrade,
    }
  );

  if (error || !data) {
    const normalized = (error?.message ?? "").toLowerCase();
    if (normalized.includes("unique") || normalized.includes("duplicate")) {
      return {
        success: false,
        error: "This class already has a final exam.",
      };
    }

    return {
      success: false,
      error: error?.message ?? "Unable to create final exam.",
    };
  }

  // Seed pending final-exam grade rows for current class members only.
  // Existing grade rows for students who left are retained (not deleted).
  const membersResult =
    await studentClassRepository.listMemberUserIdsByClassId(
      adminClient,
      input.class_id
    );

  if (membersResult.error) {
    return { success: false, error: membersResult.error.message };
  }

  const memberUserIds = (membersResult.data ?? []).map((row) => row.user_id);
  const gradesResult = await finalExamRepository.createStudentFinalExamGrades(
    adminClient,
    memberUserIds.map((studentId) => ({
      final_exam_id: data.id,
      student_id: studentId,
      status: STUDENT_TASK_STATUSES.PENDING,
    }))
  );

  if (gradesResult.error) {
    await finalExamRepository.deleteFinalExamById(adminClient, data.id);
    return { success: false, error: gradesResult.error.message };
  }

  const gradeRecords = (gradesResult.data ?? []) as StudentFinalExamGradeRecord[];
  const nameByUserId = await buildFullNameByUserId(
    adminClient,
    gradeRecords.map((row) => row.student_id)
  );

  const finalExam = mapFinalExamRecord(data as FinalExamRecord);
  const studentGrades = gradeRecords.map((row) =>
    mapStudentFinalExamGradeRecord(
      row,
      nameByUserId.get(row.student_id) ?? "Unknown student"
    )
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "final_exam",
    record_id: finalExam.id,
    new_data: {
      class_id: finalExam.class_id,
      title: finalExam.title,
      student_grade_count: studentGrades.length,
    },
    metadata: {
      note: "Final exam created with pending grade rows for enrolled students.",
    },
  });

  return {
    success: true,
    finalExam,
    studentGrades,
    message: "Final exam created.",
  };
}

export type UpdateFinalExamResult =
  | {
      success: true;
      finalExam: ManagerClassFinalExamRow;
      message: string;
    }
  | MutationFailure;

export async function updateFinalExamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<UpdateFinalExamResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.id)) {
    return { success: false, error: "Final exam not found." };
  }

  const parsed = updateFinalExamSchema.safeParse({
    title: input.title,
    description: input.description,
    due_date: input.due_date,
    max_grade: input.max_grade,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await finalExamRepository.findFinalExamById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Final exam not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    existing.data.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const maxGrade =
    parsed.data.max_grade === "" || parsed.data.max_grade === undefined
      ? null
      : Number(parsed.data.max_grade);

  const { data, error } = await finalExamRepository.updateFinalExam(
    adminClient,
    input.id,
    {
      title: parsed.data.title.trim(),
      description: normalizeOptionalString(parsed.data.description),
      due_date: toIsoOrNull(parsed.data.due_date),
      max_grade: maxGrade,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update final exam.",
    };
  }

  const finalExam = mapFinalExamRecord(data as FinalExamRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "final_exam",
    record_id: finalExam.id,
    old_data: {
      title: existing.data.title,
      description: existing.data.description,
      due_date: existing.data.due_date,
      max_grade: existing.data.max_grade,
    },
    new_data: {
      title: finalExam.title,
      description: finalExam.description,
      due_date: finalExam.due_date,
      max_grade: finalExam.max_grade,
    },
    metadata: { note: "Final exam updated." },
  });

  return {
    success: true,
    finalExam,
    message: "Final exam updated.",
  };
}

export type UpdateStudentFinalExamGradeResult =
  | {
      success: true;
      studentGrade: ManagerStudentFinalExamGradeRow;
      message: string;
    }
  | MutationFailure;

export async function updateStudentFinalExamGradeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: string;
    grade?: string | number;
    notes?: string;
    submitted_at?: string;
  }
): Promise<UpdateStudentFinalExamGradeResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_UPDATE_STUDENT);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await finalExamRepository.findStudentFinalExamGradeById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Final exam grade not found." };
  }

  const finalExamResult = await finalExamRepository.findFinalExamById(
    adminClient,
    existing.data.final_exam_id
  );

  if (finalExamResult.error) {
    return { success: false, error: finalExamResult.error.message };
  }

  if (!finalExamResult.data) {
    return { success: false, error: "Final exam not found." };
  }

  const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
    adminClient,
    finalExamResult.data.class_id,
    existing.data.student_id
  );

  if (!studentGuard.ok) {
    return { success: false, error: studentGuard.error };
  }

  const parsed = createEditStudentFinalExamGradeSchema(
    finalExamResult.data.max_grade,
    finalExamResult.data.due_date
  ).safeParse({
    status: input.status,
    grade: input.grade,
    notes: input.notes,
    submitted_at: input.submitted_at,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const grade =
    parsed.data.grade === "" || parsed.data.grade === undefined
      ? null
      : Number(parsed.data.grade);

  const gradedAt = new Date().toISOString();
  const shouldSetGradedAt =
    grade !== null &&
    (parsed.data.status === STUDENT_TASK_STATUSES.GRADED ||
      parsed.data.status === STUDENT_TASK_STATUSES.LATE);

  const { data, error } = await finalExamRepository.updateStudentFinalExamGrade(
    adminClient,
    input.id,
    {
      status: parsed.data.status,
      grade,
      notes: normalizeOptionalString(parsed.data.notes),
      submitted_at: toIsoOrNull(parsed.data.submitted_at),
      graded_at: shouldSetGradedAt ? gradedAt : null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update final exam grade.",
    };
  }

  const nameByUserId = await buildFullNameByUserId(adminClient, [
    data.student_id,
  ]);

  const studentGrade = mapStudentFinalExamGradeRecord(
    data as StudentFinalExamGradeRecord,
    nameByUserId.get(data.student_id) ?? "Unknown student"
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    table_name: "student_finalexam_grade",
    record_id: studentGrade.id,
    old_data: {
      status: existing.data.status,
      grade: existing.data.grade,
    },
    new_data: {
      status: studentGrade.status,
      grade: studentGrade.grade,
    },
  });

  return {
    success: true,
    studentGrade,
    message: "Final exam grade updated.",
  };
}

export type AddStudentToClassResult =
  | {
      success: true;
      student: ManagerClassStudentRow;
      studentGrade?: ManagerStudentFinalExamGradeRow;
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function addStudentToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileId: string;
  },
  options?: {
    /** Only transfer uses this — normal enroll always syncs payment. */
    skipPaymentSync?: boolean;
  }
): Promise<AddStudentToClassResult> {
  const timer = createNavStepTimer("addStudentToClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_ADD_STUDENT
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const parsed = addStudentToClassSchema.safeParse({
      studentProfileId: input.studentProfileId,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const [
      classResult,
      studentProfileResult,
      enrollmentResult,
      teacherResult,
      sessionResult,
    ] = await timer.step("lookups", () =>
      Promise.all([
        classRepository.findClassDetailById(adminClient, input.class_id),
        studentProfileRepository.findStudentProfileById(
          adminClient,
          parsed.data.studentProfileId
        ),
        studentClassRepository.countStudentClassesByClassId(
          adminClient,
          input.class_id
        ),
        classTeacherRepository.countClassTeachersByClassId(
          adminClient,
          input.class_id
        ),
        sessionRepository.listSessionCountsByClassIds(adminClient, [
          input.class_id,
        ]),
      ])
    );

    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }

    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    const classRecord = classResult.data as ClassDetailRecord;

    if (studentProfileResult.error) {
      return { success: false, error: studentProfileResult.error.message };
    }

    if (!studentProfileResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { studentProfileId: ["Student not found."] },
      };
    }

    if (studentProfileResult.data.status === STUDENT_STATUSES.INACTIVE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: ["Inactive students cannot be added to a class."],
        },
      };
    }

    if (enrollmentResult.error) {
      return { success: false, error: enrollmentResult.error.message };
    }

    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    const studentProfile = studentProfileResult.data;
    const userId = studentProfile.user_id;

    const enrollResult = await timer.step("enroll", () =>
      studentClassRepository.enrollStudentInClass(
        adminClient,
        userId,
        input.class_id
      )
    );

    if (enrollResult.error) {
      return { success: false, error: enrollResult.error.message };
    }

    if (!enrollResult.data) {
      return { success: false, error: "Unable to enroll student." };
    }

    if (!enrollResult.data.ok) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: ["This student is already enrolled in this class."],
        },
      };
    }

    const data = enrollResult.data.enrollment;

    const [profileResult, authResult] = await Promise.all([
      timer.step("hydrateProfile", () =>
        profileRepository.findProfileById(adminClient, userId)
      ),
      timer.step("hydrateAuth", () =>
        authRepository.getAuthUserById(adminClient, userId)
      ),
    ]);

    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error?.message ?? "Unable to load student profile.",
      };
    }

    const student: ManagerClassStudentRow = {
      id: data.id,
      student_profile_id: studentProfile.id,
      user_id: userId,
      full_name: studentProfile.full_name,
      username: profileResult.data.username,
      email: authResult.data.user?.email ?? "",
      phone: studentProfile.phone,
      joined_at: data.joined_at ?? new Date().toISOString(),
    };

    let studentGrade: ManagerStudentFinalExamGradeRow | undefined;

    const gradeResult = await timer.step("examGrade", () =>
      finalExamRepository.ensureEnrollmentFinalExamGrade(
        adminClient,
        input.class_id,
        userId
      )
    );

    if (gradeResult.error) {
      return {
        success: false,
        error:
          gradeResult.error.message ??
          "Student enrolled, but final exam grade row could not be created.",
      };
    }

    if (gradeResult.data) {
      studentGrade = mapStudentFinalExamGradeRecord(
        gradeResult.data as StudentFinalExamGradeRecord,
        student.full_name
      );
    }

    try {
      await timer.step("attendees", () =>
        seedLateJoinAttendeesForStudent(adminClient, input.class_id, userId)
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student enrolled, but attendance rows could not be created.",
      };
    }

    try {
      await timer.step("tasks", () =>
        seedLateJoinStudentTasksForStudent(
          adminClient,
          input.class_id,
          userId
        )
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student enrolled, but task grade rows could not be created.",
      };
    }

    const classRow = mapClassDetailRecordToRow(classRecord, {
      enrollment_count: (enrollmentResult.count ?? 0) + 1,
      teacher_count: teacherResult.count ?? 0,
      completed_sessions: sessionResult.data?.length ?? 0,
    });

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "student_class",
        record_id: student.id,
        new_data: {
          class_id: input.class_id,
          user_id: userId,
        },
      })
    );

    let warning: string | undefined;

    if (!options?.skipPaymentSync) {
      try {
        await timer.step("paymentSync", () =>
          onStudentJoinedClass(
            adminClient,
            { studentId: userId, classId: input.class_id },
            actor
          )
        );
      } catch (syncError) {
        await recordPaymentSyncFailure(adminClient, actor, {
          studentId: userId,
          classId: input.class_id,
          operation: "enroll_join_sync",
          error: syncError,
        });
        warning = PAYMENT_SYNC_FAILURE_WARNING;
      }
    }

    return {
      success: true,
      student,
      studentGrade,
      classRow,
      message: `${student.full_name} added to class.`,
      warning,
    };
  } finally {
    timer.end();
  }
}


export type AddStudentsToClassResult =
  | {
      success: true;
      students: ManagerClassStudentRow[];
      studentGrades: ManagerStudentFinalExamGradeRow[];
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
      autoAssignedPhase?: { id: string; name: string };
      optionalPaymentPhases?: Array<{ id: string; name: string }>;
    }
  | MutationFailure;

export async function addStudentsToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileIds: string[];
  }
): Promise<AddStudentsToClassResult> {
  const timer = createNavStepTimer("addStudentsToClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_ADD_STUDENT
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const parsed = addStudentsToClassSchema.safeParse({
      studentProfileIds: input.studentProfileIds,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const uniqueIds = [...new Set(parsed.data.studentProfileIds)];

    const [
      classResult,
      studentProfilesResult,
      enrollmentResult,
      teacherResult,
      sessionResult,
    ] = await timer.step("lookups", () =>
      Promise.all([
        classRepository.findClassDetailById(adminClient, input.class_id),
        studentProfileRepository.listStudentProfilesByIds(adminClient, uniqueIds),
        studentClassRepository.countStudentClassesByClassId(
          adminClient,
          input.class_id
        ),
        classTeacherRepository.countClassTeachersByClassId(
          adminClient,
          input.class_id
        ),
        sessionRepository.listSessionCountsByClassIds(adminClient, [
          input.class_id,
        ]),
      ])
    );

    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }

    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    if (studentProfilesResult.error) {
      return { success: false, error: studentProfilesResult.error.message };
    }

    if (enrollmentResult.error) {
      return { success: false, error: enrollmentResult.error.message };
    }

    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    const classRecord = classResult.data as ClassDetailRecord;
    const profileById = new Map(
      (studentProfilesResult.data ?? []).map((row) => [row.id, row])
    );

    const eligibleUserIds: string[] = [];
    const seenUserIds = new Set<string>();
    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile || profile.status === STUDENT_STATUSES.INACTIVE) {
        continue;
      }
      if (seenUserIds.has(profile.user_id)) {
        continue;
      }
      seenUserIds.add(profile.user_id);
      eligibleUserIds.push(profile.user_id);
    }

    const enrollResult = await timer.step("enroll", () =>
      studentClassRepository.enrollStudentsInClass(
        adminClient,
        input.class_id,
        eligibleUserIds
      )
    );

    if (enrollResult.error || !enrollResult.data) {
      return {
        success: false,
        error: enrollResult.error?.message ?? "Unable to enroll students.",
      };
    }

    const insertedByUserId = new Map(
      enrollResult.data.inserted.map((row) => [row.user_id, row])
    );
    const alreadyEnrolled = new Set(enrollResult.data.already_enrolled);
    const insertedUserIds = enrollResult.data.inserted.map((row) => row.user_id);

    const failures: string[] = [];
    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile) {
        failures.push("Student not found.");
        continue;
      }
      if (profile.status === STUDENT_STATUSES.INACTIVE) {
        failures.push("Inactive students cannot be added to a class.");
        continue;
      }
      if (alreadyEnrolled.has(profile.user_id)) {
        failures.push("This student is already enrolled in this class.");
        continue;
      }
      if (!insertedByUserId.has(profile.user_id)) {
        failures.push("Unable to enroll student.");
      }
    }

    if (insertedUserIds.length === 0) {
      return {
        success: false,
        error: failures[0] ?? "Unable to enroll students.",
        fieldErrors: {
          studentProfileIds: [failures[0] ?? "Unable to enroll students."],
        },
      };
    }

    let gradeResult: Awaited<
      ReturnType<typeof finalExamRepository.ensureEnrollmentFinalExamGrades>
    >;
    let profilesResult: Awaited<
      ReturnType<typeof profileRepository.listProfilesByIds>
    >;
    let emailsResult: Awaited<
      ReturnType<typeof authRepository.listAuthEmailsByIds>
    >;

    try {
      [gradeResult, , , profilesResult, emailsResult] = await timer.step(
        "hydrate",
        () =>
          Promise.all([
            finalExamRepository.ensureEnrollmentFinalExamGrades(
              adminClient,
              input.class_id,
              insertedUserIds
            ),
            seedLateJoinAttendeesForStudents(
              adminClient,
              input.class_id,
              insertedUserIds
            ),
            seedLateJoinStudentTasksForStudents(
              adminClient,
              input.class_id,
              insertedUserIds
            ),
            profileRepository.listProfilesByIds(adminClient, insertedUserIds),
            authRepository.listAuthEmailsByIds(adminClient, insertedUserIds),
          ])
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student enrolled, but attendance or task grade rows could not be created.",
      };
    }

    if (gradeResult.error) {
      return {
        success: false,
        error:
          gradeResult.error.message ??
          "Student enrolled, but final exam grade row could not be created.",
      };
    }

    if (profilesResult.error) {
      return {
        success: false,
        error: profilesResult.error.message ?? "Unable to load student profile.",
      };
    }

    if (emailsResult.error) {
      return {
        success: false,
        error: emailsResult.error.message,
      };
    }

    const usernameByUserId = new Map(
      (profilesResult.data ?? []).map((row) => [row.id, row.username])
    );
    const emailByUserId = emailsResult.data;
    const gradeByStudentId = new Map(
      (gradeResult.data ?? []).map((row) => [row.student_id, row])
    );

    const students: ManagerClassStudentRow[] = [];
    const studentGrades: ManagerStudentFinalExamGradeRow[] = [];

    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile) {
        continue;
      }
      const enrollment = insertedByUserId.get(profile.user_id);
      if (!enrollment) {
        continue;
      }

      const student: ManagerClassStudentRow = {
        id: enrollment.id,
        student_profile_id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        username: usernameByUserId.get(profile.user_id) ?? null,
        email: emailByUserId.get(profile.user_id) ?? "",
        phone: profile.phone,
        joined_at: enrollment.joined_at ?? new Date().toISOString(),
      };
      students.push(student);

      const gradeRecord = gradeByStudentId.get(profile.user_id);
      if (gradeRecord) {
        studentGrades.push(
          mapStudentFinalExamGradeRecord(gradeRecord, student.full_name)
        );
      }
    }

    const classRow = mapClassDetailRecordToRow(classRecord, {
      enrollment_count: (enrollmentResult.count ?? 0) + insertedUserIds.length,
      teacher_count: teacherResult.count ?? 0,
      completed_sessions: sessionResult.data?.length ?? 0,
    });

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "student_class",
        record_id: input.class_id,
        metadata: {
          note: "Students enrolled in class (batch).",
          class_id: input.class_id,
          count: students.length,
          enrollments: students.map((student) => ({
            student_class_id: student.id,
            user_id: student.user_id,
            student_profile_id: student.student_profile_id,
          })),
        },
      })
    );

    let warning: string | undefined;
    let joinItems: StudentJoinSyncItem[] = [];

    try {
      joinItems = await timer.step("paymentSync", () =>
        onStudentsJoinedClass(
          adminClient,
          { classId: input.class_id, studentIds: insertedUserIds },
          actor
        )
      );
      const failedJoins = joinItems.filter((item) => !item.ok);
      if (failedJoins.length > 0) {
        await Promise.all(
          failedJoins.map((item) =>
            recordPaymentSyncFailure(adminClient, actor, {
              studentId: item.studentId,
              classId: input.class_id,
              operation: "enroll_join_sync",
              error: new Error(item.error ?? "Payment sync failed."),
            })
          )
        );
        warning = PAYMENT_SYNC_FAILURE_WARNING;
      }
    } catch (syncError) {
      await Promise.all(
        insertedUserIds.map((studentId) =>
          recordPaymentSyncFailure(adminClient, actor, {
            studentId,
            classId: input.class_id,
            operation: "enroll_join_sync",
            error: syncError,
          })
        )
      );
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }

    let autoAssignedPhase: { id: string; name: string } | undefined;
    let optionalPaymentPhases: Array<{ id: string; name: string }> | undefined;

    if (
      !warning &&
      students.length === 1 &&
      joinItems.length > 0
    ) {
      const student = students[0];
      const joinItem = joinItems.find(
        (item) => item.ok && item.studentId === student.user_id && item.phase
      );
      const phase = joinItem?.phase;
      if (phase && actorUserId) {
        const canAssignOptional = await hasPermission(
          adminClient,
          actorUserId,
          PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
        );
        if (canAssignOptional) {
          const { data: openedPhases, error: openedError } =
            await paymentPhaseRepository.listOpenedPaymentPhasesBySemesterId(
              adminClient,
              phase.semester_id
            );
          if (!openedError) {
            const others = (openedPhases ?? [])
              .filter((row) => row.id !== phase.id)
              .map((row) => ({ id: row.id, name: row.name }));
            if (others.length > 0) {
              autoAssignedPhase = { id: phase.id, name: phase.name };
              optionalPaymentPhases = others;
            }
          }
        }
      }
    }

    const message =
      failures.length === 0
        ? students.length === 1
          ? `${students[0].full_name} added to class.`
          : `${students.length} students added to class.`
        : `Added ${students.length} of ${uniqueIds.length} students. ${failures.length} could not be added.`;

    return {
      success: true,
      students,
      studentGrades,
      classRow,
      message,
      warning,
      autoAssignedPhase,
      optionalPaymentPhases,
    };
  } finally {
    timer.end();
  }
}

export type RemoveStudentFromClassResult =
  | {
      success: true;
      removedStudentId: string;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function removeStudentFromClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
  }
): Promise<RemoveStudentFromClassResult> {
  const timer = createNavStepTimer("removeStudentFromClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_REMOVE_STUDENT
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const parsed = removeStudentFromClassSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { data: deleted, error: deleteError } = await timer.step(
      "delete",
      () =>
        studentClassRepository.deleteStudentClassMembership(
          adminClient,
          parsed.data.id,
          parsed.data.class_id
        )
    );

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    if (!deleted) {
      return { success: false, error: "Enrollment not found." };
    }

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "delete",
        severity: "info",
        table_name: "student_class",
        record_id: deleted.id,
        old_data: {
          class_id: parsed.data.class_id,
          user_id: deleted.user_id,
        },
        new_data: null,
        metadata: {
          note: "Student removed from class (binary membership).",
          class_id: parsed.data.class_id,
          student_id: deleted.user_id,
        },
      })
    );

    let warning: string | undefined;

    try {
      await timer.step("paymentSync", () =>
        onStudentLeftClass(
          adminClient,
          { studentId: deleted.user_id, classId: parsed.data.class_id },
          actor
        )
      );
    } catch (syncError) {
      await recordPaymentSyncFailure(adminClient, actor, {
        studentId: deleted.user_id,
        classId: parsed.data.class_id,
        operation: "enrollment_leave_sync",
        error: syncError,
      });
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }

    return {
      success: true,
      removedStudentId: deleted.id,
      message: "Student removed from class.",
      warning,
    };
  } finally {
    timer.end();
  }
}

export type TransferStudentBetweenClassesResult =
  | {
      success: true;
      student: ManagerClassStudentRow;
      from_class_id: string;
      to_class_id: string;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function transferStudentBetweenClassesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_profile_id: string;
    from_class_id: string;
    to_class_id: string;
  }
): Promise<TransferStudentBetweenClassesResult> {
  const timer = createNavStepTimer("transferStudentBetweenClasses");
  try {
    const [removeUnauthorized, addUnauthorized] = await timer.step("auth", () =>
      Promise.all([
        getUnauthorizedError(
          adminClient,
          actorUserId,
          PERMISSIONS.CLASSES_REMOVE_STUDENT
        ),
        getUnauthorizedError(
          adminClient,
          actorUserId,
          PERMISSIONS.CLASSES_ADD_STUDENT
        ),
      ])
    );
    if (removeUnauthorized) {
      return { success: false, error: removeUnauthorized };
    }
    if (addUnauthorized) {
      return { success: false, error: addUnauthorized };
    }

    const parsed = transferStudentBetweenClassesSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { student_profile_id, from_class_id, to_class_id } = parsed.data;

    const [fromClassResult, toClassResult, studentProfileResult] =
      await timer.step("lookups", () =>
        Promise.all([
          classRepository.findClassDetailById(adminClient, from_class_id),
          classRepository.findClassDetailById(adminClient, to_class_id),
          studentProfileRepository.findStudentProfileById(
            adminClient,
            student_profile_id
          ),
        ])
      );

    if (fromClassResult.error) {
      return { success: false, error: fromClassResult.error.message };
    }
    if (!fromClassResult.data) {
      return { success: false, error: "Source class not found." };
    }

    if (toClassResult.error) {
      return { success: false, error: toClassResult.error.message };
    }
    if (!toClassResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { to_class_id: ["Destination class not found."] },
      };
    }

    if (studentProfileResult.error || !studentProfileResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { student_profile_id: ["Student not found."] },
      };
    }

    if (studentProfileResult.data.status === STUDENT_STATUSES.INACTIVE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          student_profile_id: [
            "Inactive students cannot be added to a class.",
          ],
        },
      };
    }

    const studentProfile = studentProfileResult.data;
    const userId = studentProfile.user_id;

    const transferResult = await timer.step("transfer", () =>
      studentClassRepository.transferStudentBetweenClasses(
        adminClient,
        userId,
        from_class_id,
        to_class_id
      )
    );

    if (transferResult.error) {
      return { success: false, error: transferResult.error.message };
    }

    if (!transferResult.data) {
      return { success: false, error: "Unable to transfer student." };
    }

    if (!transferResult.data.ok) {
      if (transferResult.data.code === "not_in_source") {
        return {
          success: false,
          error: "Student is not enrolled in the source class.",
        };
      }
      if (transferResult.data.code === "already_in_dest") {
        return {
          success: false,
          error: "Please fix the errors below.",
          fieldErrors: {
            to_class_id: ["Student is already in the destination class."],
          },
        };
      }
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          to_class_id: [
            "Destination class must be different from the current class.",
          ],
        },
      };
    }

    const destEnrollment = transferResult.data.to;
    const fromEnrollment = transferResult.data.from;

    let warning: string | undefined;

    try {
      await timer.step("leaveSync", () =>
        onStudentLeftClass(
          adminClient,
          { studentId: userId, classId: from_class_id },
          actor
        )
      );
    } catch (syncError) {
      await recordPaymentSyncFailure(adminClient, actor, {
        studentId: userId,
        classId: from_class_id,
        operation: "transfer_leave_sync",
        error: syncError,
      });
      warning = PAYMENT_SYNC_FAILURE_WARNING;
    }

    let profileResult: Awaited<
      ReturnType<typeof profileRepository.findProfileById>
    >;
    let authResult: Awaited<
      ReturnType<typeof authRepository.getAuthUserById>
    >;
    let gradeResult: Awaited<
      ReturnType<typeof finalExamRepository.ensureEnrollmentFinalExamGrade>
    >;

    try {
      [profileResult, authResult, gradeResult] = await timer.step(
        "destHydrate",
        () =>
          Promise.all([
            profileRepository.findProfileById(adminClient, userId),
            authRepository.getAuthUserById(adminClient, userId),
            finalExamRepository.ensureEnrollmentFinalExamGrade(
              adminClient,
              to_class_id,
              userId
            ),
            seedLateJoinAttendeesForStudent(adminClient, to_class_id, userId),
            seedLateJoinStudentTasksForStudent(
              adminClient,
              to_class_id,
              userId
            ),
          ]).then(([profile, auth, grade]) => [profile, auth, grade] as const)
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Student transferred, but destination attendance or task rows could not be created.",
      };
    }

    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error?.message ?? "Unable to load student profile.",
      };
    }

    if (gradeResult.error) {
      return {
        success: false,
        error:
          gradeResult.error.message ??
          "Student transferred, but final exam grade row could not be created.",
      };
    }

    const student: ManagerClassStudentRow = {
      id: destEnrollment.id,
      student_profile_id: studentProfile.id,
      user_id: userId,
      full_name: studentProfile.full_name,
      username: profileResult.data.username,
      email: authResult.data.user?.email ?? "",
      phone: studentProfile.phone,
      joined_at: destEnrollment.joined_at ?? new Date().toISOString(),
    };

    await timer.step("audit", () =>
      Promise.all([
        recordManagerAuditLog(adminClient, actor, {
          action: "insert",
          table_name: "student_class",
          record_id: student.id,
          new_data: {
            class_id: to_class_id,
            user_id: userId,
          },
        }),
        recordManagerAuditLog(adminClient, actor, {
          action: "update",
          severity: "info",
          table_name: "student_class",
          record_id: student.id,
          old_data: {
            class_id: from_class_id,
          },
          new_data: {
            class_id: to_class_id,
            from_enrollment_id: fromEnrollment.id,
          },
          metadata: {
            note: "Student transferred between classes without destination payment sync.",
            from_class_id,
            to_class_id,
            student_id: userId,
          },
        }),
      ])
    );

    return {
      success: true,
      student,
      from_class_id,
      to_class_id,
      message: `${student.full_name} transferred. Destination billing was not auto-assigned.`,
      warning,
    };
  } finally {
    timer.end();
  }
}
