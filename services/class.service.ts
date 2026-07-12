import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import {
  STUDENT_CLASS_STATUSES,
  type StudentClassStatusValue,
} from "@/lib/constants/manager-student-class-status";
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
import { addStudentToClassSchema } from "@/lib/validators/manager/add-student-to-class";
import { updateStudentClassStatusSchema } from "@/lib/validators/manager/update-student-class-status";
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
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { StudentClassRecord } from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as taskRepository from "@/repositories/task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { LATE_ENROLLMENT_NOTE } from "@/lib/constants/manager-late-enrollment";
import { isDueDatePast } from "@/lib/manager/late-enrollment";
import { isAttendeePresentForRate } from "@/lib/constants/manager-attendee-status";
import {
  CLASS_GRADES_LOCKED_ERROR,
  isClassGradesUnlocked,
} from "@/lib/manager/class-grades-access";
import {
  assertClassStructureUnlockedForComputedGrades,
  assertStudentGradeInputsUnlockedForComputedGrade,
} from "@/services/class-computed-grade-lock.service";
import { ensureSessionAttendeesForEnrolledStudents, seedLateJoinAttendeesForStudent, seedLateJoinStudentTasksForStudent } from "@/services/session.service";
import { listStudentsForManager } from "@/services/student.service";
import { ensureSubscribedSemesterForStudent, reassignClassStudentsSubscribedSemesters } from "@/services/subscribed-semester.service";
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

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
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

function mapEnrollmentStatus(status: string | null): StudentClassStatusValue {
  if (
    status === STUDENT_CLASS_STATUSES.ENROLLED ||
    status === STUDENT_CLASS_STATUSES.PAUSED ||
    status === STUDENT_CLASS_STATUSES.STOPPED
  ) {
    return status;
  }

  if (status === "done") {
    return STUDENT_CLASS_STATUSES.STOPPED;
  }

  if (status === "in_progress" || status === "active") {
    return STUDENT_CLASS_STATUSES.ENROLLED;
  }

  return STUDENT_CLASS_STATUSES.ENROLLED;
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
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

async function mapClassDetailToRow(
  adminClient: Supabase,
  record: ClassDetailRecord
): Promise<ManagerClassRow> {
  const [enrollmentResult, teacherResult, sessionResult] = await Promise.all([
    studentClassRepository.countStudentClassesByClassId(adminClient, record.id),
    classTeacherRepository.countClassTeachersByClassId(adminClient, record.id),
    sessionRepository.listSessionCountsByClassIds(adminClient, [record.id]),
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
    id: record.id,
    name: record.name,
    subject_id: record.subject_id ?? "",
    subject_name: record.subjects?.name ?? "—",
    subject_nb_sessions: record.subjects?.nb_sessions ?? 0,
    completed_sessions: sessionResult.data?.length ?? 0,
    status: mapClassStatus(record.status),
    semester_id: record.semester_id,
    semester_name: record.semesters?.name ?? null,
    enrollment_count: enrollmentResult.count ?? 0,
    teacher_count: teacherResult.count ?? 0,
    created_at: record.created_at ?? "",
  };
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

function buildEnrollmentFinalExamGradeInput(
  finalExamId: string,
  studentId: string,
  dueDate: string | null
): {
  final_exam_id: string;
  student_id: string;
  status: string;
  grade?: number | null;
  notes?: string | null;
} {
  if (isDueDatePast(dueDate)) {
    return {
      final_exam_id: finalExamId,
      student_id: studentId,
      status: STUDENT_TASK_STATUSES.MISSING,
      grade: 0,
      notes: LATE_ENROLLMENT_NOTE,
    };
  }

  return {
    final_exam_id: finalExamId,
    student_id: studentId,
    status: STUDENT_TASK_STATUSES.PENDING,
  };
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
  actorRole: RoleValue | null
): Promise<ManagerClassRow[]> {
  assertManagerRole(actorRole);

  const { data, error } = await classRepository.listClassDetails(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return mapClassDetailRecordsToRows(
    adminClient,
    (data ?? []) as ClassDetailRecord[]
  );
}

export type CreateClassResult =
  | { success: true; classRow: ManagerClassRow; message: string }
  | MutationFailure;

export async function createClassForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    name: string;
    subject_id: string;
    status: string;
    semester_id?: string;
    teacher_id?: string;
  }
): Promise<CreateClassResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

  const subjectResult = await subjectRepository.findSubjectById(
    adminClient,
    parsed.data.subject_id
  );

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

  const nextSemesterId =
    parsed.data.semester_id &&
    parsed.data.semester_id !== "unlinked" &&
    parsed.data.semester_id !== ""
      ? parsed.data.semester_id
      : null;

  if (nextSemesterId) {
    const semesterResult = await semesterRepository.findSemesterById(
      adminClient,
      nextSemesterId
    );

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

  const nextTeacherId =
    parsed.data.teacher_id &&
    parsed.data.teacher_id !== "none" &&
    parsed.data.teacher_id !== ""
      ? parsed.data.teacher_id
      : null;

  if (nextTeacherId) {
    if (!isUuid(nextTeacherId)) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { teacher_id: ["Invalid teacher."] },
      };
    }

    const teacherResult = await profileRepository.findProfileById(
      adminClient,
      nextTeacherId
    );

    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (!teacherResult.data || teacherResult.data.role !== ROLES.TEACHER) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { teacher_id: ["Teacher not found."] },
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

  const classRow = await mapClassDetailToRow(
    adminClient,
    data as ClassDetailRecord
  );

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
  actorRole: RoleValue | null,
  classId: string
): Promise<ManagerClassRow | null> {
  assertManagerRole(actorRole);

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
  actorRole: RoleValue | null,
  classId: string
): Promise<
  | { ok: true; classRow: ManagerClassRow }
  | { ok: false; error: string }
> {
  assertManagerRole(actorRole);

  if (!isUuid(classId)) {
    return { ok: false, error: "Class not found." };
  }

  const classRow = await getClassForManager(adminClient, actorRole, classId);

  if (!classRow) {
    return { ok: false, error: "Class not found." };
  }

  if (!isClassGradesUnlocked(classRow.status)) {
    return { ok: false, error: CLASS_GRADES_LOCKED_ERROR };
  }

  return { ok: true, classRow };
}

export async function listTeacherOptionsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerClassTeacherSelectOption[]> {
  assertManagerRole(actorRole);

  const teachersResult = await profileRepository.listProfiles(adminClient, {
    roles: [ROLES.TEACHER],
  });

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  return (teachersResult.data ?? []).map((teacher) => ({
    id: teacher.id,
    username: teacher.username,
  }));
}

export async function listClassTeacherOptionsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  assertManagerRole(actorRole);

  if (!isUuid(classId)) {
    return [];
  }

  const [teachers, assignmentsResult] = await Promise.all([
    listTeacherOptionsForManager(adminClient, actorRole),
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: { class_id: string; teacher_id: string }
): Promise<AssignClassTeacherResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = assignClassTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const classResult = await classRepository.findClassDetailById(
    adminClient,
    parsed.data.class_id
  );

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

  const teacherResult = await profileRepository.findProfileById(
    adminClient,
    parsed.data.teacher_id
  );

  if (teacherResult.error) {
    return { success: false, error: teacherResult.error.message };
  }

  if (!teacherResult.data || teacherResult.data.role !== ROLES.TEACHER) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { teacher_id: ["Teacher not found."] },
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

  const classRow = await mapClassDetailToRow(
    adminClient,
    classResult.data as ClassDetailRecord
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: { class_id: string; teacher_id: string }
): Promise<UnassignClassTeacherResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = assignClassTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const classResult = await classRepository.findClassDetailById(
    adminClient,
    parsed.data.class_id
  );

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

  const existing = await classTeacherRepository.findClassTeacherByTeacherAndClass(
    adminClient,
    parsed.data.teacher_id,
    parsed.data.class_id
  );

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

  const classRow = await mapClassDetailToRow(
    adminClient,
    classResult.data as ClassDetailRecord
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
  actorRole: RoleValue | null,
  classId: string
): Promise<ManagerClassSessionRow[]> {
  assertManagerRole(actorRole);

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
  actorRole: RoleValue | null,
  classId: string
): Promise<ManagerClassStudentRow[]> {
  assertManagerRole(actorRole);

  const { data: enrollments, error } =
    await studentClassRepository.listStudentClassesByClassId(
      adminClient,
      classId
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!enrollments?.length) {
    return [];
  }

  const userIds = enrollments.map((row) => row.user_id);

  const [profilesResult, studentProfilesResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, userIds),
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      userIds
    ),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (studentProfilesResult.error) {
    throw new Error(studentProfilesResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const studentProfileByUserId = new Map(
    (studentProfilesResult.data ?? []).map((row) => [row.user_id, row])
  );

  const rows: ManagerClassStudentRow[] = [];

  for (const enrollment of enrollments) {
    const studentProfile = studentProfileByUserId.get(enrollment.user_id);
    const profile = profileById.get(enrollment.user_id);

    if (!studentProfile || !profile) {
      continue;
    }

    const authResult = await authRepository.getAuthUserById(
      adminClient,
      enrollment.user_id
    );

    rows.push({
      id: enrollment.id,
      student_profile_id: studentProfile.id,
      user_id: enrollment.user_id,
      full_name: studentProfile.full_name,
      username: profile.username,
      email: authResult.data.user?.email ?? "",
      phone: studentProfile.phone,
      enrollment_status: mapEnrollmentStatus(enrollment.status),
      joined_at: enrollment.joined_at ?? "",
    });
  }

  return rows;
}

export async function listAvailableStudentsForClass(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  classId: string
): Promise<ManagerStudentRow[]> {
  assertManagerRole(actorRole);

  const [membershipResult, students] = await Promise.all([
    studentClassRepository.listStudentUserIdsByClassId(adminClient, classId),
    listStudentsForManager(adminClient, actorRole),
  ]);

  if (membershipResult.error) {
    throw new Error(membershipResult.error.message);
  }

  const memberIds = new Set(
    (membershipResult.data ?? []).map((row) => row.user_id)
  );

  return students.filter((student) => !memberIds.has(student.user_id));
}

export async function getClassFinalExamForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  classId: string
): Promise<{
  finalExam: ManagerClassFinalExamRow | null;
  studentGrades: ManagerStudentFinalExamGradeRow[];
}> {
  assertManagerRole(actorRole);

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
  actorRole: RoleValue | null,
  classId: string
): Promise<ManagerClassAnalyticsPreview> {
  assertManagerRole(actorRole);

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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    class_id: string;
    name: string;
    subject_id: string;
    status: string;
    semester_id?: string;
  }
): Promise<UpdateClassResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

  const existing = await classRepository.findClassDetailById(
    adminClient,
    input.class_id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Class not found." };
  }

  const subjectResult = await subjectRepository.findSubjectById(
    adminClient,
    parsed.data.subject_id
  );

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

  const nextSemesterId =
    parsed.data.semester_id && parsed.data.semester_id !== "unlinked"
      ? parsed.data.semester_id
      : null;

  if (nextSemesterId) {
    const semesterResult = await semesterRepository.findSemesterById(
      adminClient,
      nextSemesterId
    );

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

    if (nextSemesterId) {
      await reassignClassStudentsSubscribedSemesters(
        adminClient,
        input.class_id,
        previousSemesterId,
        nextSemesterId
      );
    }
  }

  const classRow = await mapClassDetailToRow(
    adminClient,
    data as ClassDetailRecord
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
  | { success: true; classRow: ManagerClassRow; message: string }
  | MutationFailure;

export async function updateClassStatusForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: { class_id: string; status: string }
): Promise<UpdateClassStatusResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

  const existing = await classRepository.findClassDetailById(
    adminClient,
    input.class_id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Class not found." };
  }

  const { data, error } = await classRepository.updateClassStatus(
    adminClient,
    input.class_id,
    parsed.data.status
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update class status.",
    };
  }

  const classRow = await mapClassDetailToRow(
    adminClient,
    data as ClassDetailRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    table_name: "classes",
    record_id: classRow.id,
    old_data: { status: existing.data.status },
    new_data: { status: classRow.status },
  });

  return {
    success: true,
    classRow,
    message: "Class status updated.",
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    class_id: string;
    topic: string;
    starts_at: string;
    ends_at: string;
  }
): Promise<CreateClassSessionResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

  const existing = await classRepository.findClassDetailById(
    adminClient,
    input.class_id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Class not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const maxOrderResult = await sessionRepository.getMaxSessionNbOrderByClassId(
    adminClient,
    input.class_id
  );

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
    await ensureSessionAttendeesForEnrolledStudents(
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

  const refreshed = await classRepository.findClassDetailById(
    adminClient,
    input.class_id
  );

  if (refreshed.error || !refreshed.data) {
    return {
      success: false,
      error: refreshed.error?.message ?? "Session created, but class reload failed.",
    };
  }

  const classRow = await mapClassDetailToRow(
    adminClient,
    refreshed.data as ClassDetailRecord
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    class_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<CreateFinalExamResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

  const existingClass = await classRepository.findClassById(
    adminClient,
    input.class_id
  );

  if (existingClass.error) {
    return { success: false, error: existingClass.error.message };
  }

  if (!existingClass.data) {
    return { success: false, error: "Class not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const existingExam = await finalExamRepository.findFinalExamByClassId(
    adminClient,
    input.class_id
  );

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

  const enrolledResult =
    await studentClassRepository.listEnrolledUserIdsByClassId(
      adminClient,
      input.class_id
    );

  if (enrolledResult.error) {
    return { success: false, error: enrolledResult.error.message };
  }

  const enrolledUserIds = (enrolledResult.data ?? []).map((row) => row.user_id);
  const gradesResult = await finalExamRepository.createStudentFinalExamGrades(
    adminClient,
    enrolledUserIds.map((studentId) => ({
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<UpdateFinalExamResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    status: string;
    grade?: string | number;
    notes?: string;
    submitted_at?: string;
  }
): Promise<UpdateStudentFinalExamGradeResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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
    }
  | MutationFailure;

export async function addStudentToClassForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileId: string;
  }
): Promise<AddStudentToClassResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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

  const classResult = await classRepository.findClassDetailById(
    adminClient,
    input.class_id
  );

  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }

  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }

  const studentProfileResult =
    await studentProfileRepository.findStudentProfileById(
      adminClient,
      parsed.data.studentProfileId
    );

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

  const userId = studentProfileResult.data.user_id;

  const existingEnrollment =
    await studentClassRepository.findStudentClassByUserAndClass(
      adminClient,
      userId,
      input.class_id
    );

  if (existingEnrollment.error) {
    return { success: false, error: existingEnrollment.error.message };
  }

  if (existingEnrollment.data) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        studentProfileId: ["This student is already enrolled in this class."],
      },
    };
  }

  const { data, error } = await studentClassRepository.createStudentClassEnrollment(
    adminClient,
    {
      user_id: userId,
      class_id: input.class_id,
      status: STUDENT_CLASS_STATUSES.ENROLLED,
    }
  );

  if (error || !data) {
    const normalized = (error?.message ?? "").toLowerCase();
    if (normalized.includes("unique") || normalized.includes("duplicate")) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: ["This student is already enrolled in this class."],
        },
      };
    }

    return {
      success: false,
      error: error?.message ?? "Unable to enroll student.",
    };
  }

  const [profileResult, authResult] = await Promise.all([
    profileRepository.findProfileById(adminClient, userId),
    authRepository.getAuthUserById(adminClient, userId),
  ]);

  if (profileResult.error || !profileResult.data) {
    return {
      success: false,
      error: profileResult.error?.message ?? "Unable to load student profile.",
    };
  }

  const student: ManagerClassStudentRow = {
    id: data.id,
    student_profile_id: studentProfileResult.data.id,
    user_id: userId,
    full_name: studentProfileResult.data.full_name,
    username: profileResult.data.username,
    email: authResult.data.user?.email ?? "",
    phone: studentProfileResult.data.phone,
    enrollment_status: mapEnrollmentStatus(data.status),
    joined_at: data.joined_at ?? new Date().toISOString(),
  };

  let studentGrade: ManagerStudentFinalExamGradeRow | undefined;

  const examResult = await finalExamRepository.findFinalExamByClassId(
    adminClient,
    input.class_id
  );

  if (examResult.error) {
    return { success: false, error: examResult.error.message };
  }

  if (examResult.data) {
    const gradeResult = await finalExamRepository.createStudentFinalExamGrade(
      adminClient,
      buildEnrollmentFinalExamGradeInput(
        examResult.data.id,
        userId,
        examResult.data.due_date
      )
    );

    if (gradeResult.error || !gradeResult.data) {
      return {
        success: false,
        error:
          gradeResult.error?.message ??
          "Student enrolled, but final exam grade row could not be created.",
      };
    }

    studentGrade = mapStudentFinalExamGradeRecord(
      gradeResult.data as StudentFinalExamGradeRecord,
      student.full_name
    );
  }

  try {
    await seedLateJoinAttendeesForStudent(adminClient, input.class_id, userId);
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
    await seedLateJoinStudentTasksForStudent(
      adminClient,
      input.class_id,
      userId
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

  const classRow = await mapClassDetailToRow(
    adminClient,
    classResult.data as ClassDetailRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    table_name: "student_class",
    record_id: student.id,
    new_data: {
      class_id: input.class_id,
      user_id: userId,
      status: student.enrollment_status,
    },
  });

  const classSemesterId = classResult.data.semester_id;
  if (classSemesterId) {
    await ensureSubscribedSemesterForStudent(
      adminClient,
      parsed.data.studentProfileId,
      classSemesterId
    );
  }

  return {
    success: true,
    student,
    studentGrade,
    classRow,
    message: `${student.full_name} added to class.`,
  };
}

export type UpdateClassStudentStatusResult =
  | {
      success: true;
      student: ManagerClassStudentRow;
      message: string;
    }
  | MutationFailure;

export async function updateClassStudentStatusForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    status: string;
  }
): Promise<UpdateClassStudentStatusResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateStudentClassStatusSchema.safeParse({
    status: input.status,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await studentClassRepository.findStudentClassById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data || existing.data.class_id !== input.class_id) {
    return { success: false, error: "Enrollment not found." };
  }

  const { data, error } = await studentClassRepository.updateStudentClassStatus(
    adminClient,
    input.id,
    parsed.data.status
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update enrollment status.",
    };
  }

  const enrollment = data as StudentClassRecord;
  const [profileResult, studentProfileResult, authResult] = await Promise.all([
    profileRepository.findProfileById(adminClient, enrollment.user_id),
    studentProfileRepository.findStudentProfileByUserId(
      adminClient,
      enrollment.user_id
    ),
    authRepository.getAuthUserById(adminClient, enrollment.user_id),
  ]);

  if (profileResult.error || !profileResult.data) {
    return {
      success: false,
      error: profileResult.error?.message ?? "Unable to load student profile.",
    };
  }

  if (studentProfileResult.error || !studentProfileResult.data) {
    return {
      success: false,
      error:
        studentProfileResult.error?.message ??
        "Unable to load student profile.",
    };
  }

  const student: ManagerClassStudentRow = {
    id: enrollment.id,
    student_profile_id: studentProfileResult.data.id,
    user_id: enrollment.user_id,
    full_name: studentProfileResult.data.full_name,
    username: profileResult.data.username,
    email: authResult.data.user?.email ?? "",
    phone: studentProfileResult.data.phone,
    enrollment_status: mapEnrollmentStatus(enrollment.status),
    joined_at: enrollment.joined_at ?? "",
  };

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_class",
    record_id: student.id,
    old_data: {
      status: existing.data.status,
    },
    new_data: {
      status: student.enrollment_status,
    },
  });

  return {
    success: true,
    student,
    message: "Enrollment status updated.",
  };
}
