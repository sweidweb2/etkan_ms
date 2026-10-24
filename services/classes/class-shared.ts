import "server-only";

import {
  CLASS_STATUSES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import {
  STUDENT_TASK_STATUSES,
  type StudentTaskStatusValue,
} from "@/lib/constants/manager-student-task-status";
import { datetimeLocalToUtcIso } from "@/lib/utils/datetime-local-to-utc-iso";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import type {
  FinalExamRecord,
  StudentFinalExamGradeRecord,
} from "@/repositories/final-exam.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { SessionGroupGradeLevelValue } from "@/types/manager-session-group-grade";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { z } from "zod";

export type Supabase = SupabaseClient<Database>;

export type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export const PAYMENT_SYNC_FAILURE_WARNING =
  "Payment sync failed. Check Accounting → Missing assignments.";

export async function recordPaymentSyncFailure(
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

export function mapClassStatus(status: string | null): ClassStatusValue {
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

export function mapFinalExamStatus(status: string): StudentTaskStatusValue {
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

export function mapGroupGradeLevel(
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

export function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toIsoOrNull(value?: string | null): string | null {
  return datetimeLocalToUtcIso(value);
}

export function mapSessionRecord(record: SessionRecord): ManagerClassSessionRow {
  return {
    id: record.id,
    class_id: record.class_id,
    nb_order: record.nb_order,
    topic: record.topic,
    session_report: record.session_report,
    starts_at: record.starts_at,
    ends_at: record.ends_at,
    semester_id: record.semester_id,
    group_grade_level: mapGroupGradeLevel(record.group_grade_level),
    created_at: record.created_at,
  };
}

export function mapFinalExamRecord(record: FinalExamRecord): ManagerClassFinalExamRow {
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

export function mapStudentFinalExamGradeRecord(
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

export function mapClassDetailRecordToRow(
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
    image_url: record.image_url,
    enrollment_count: counts.enrollment_count,
    teacher_count: counts.teacher_count,
    created_at: record.created_at ?? "",
  };
}

export async function loadClassDetailCounts(
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

export async function mapClassDetailToRow(
  adminClient: Supabase,
  record: ClassDetailRecord
): Promise<ManagerClassRow> {
  const counts = await loadClassDetailCounts(adminClient, record.id);
  return mapClassDetailRecordToRow(record, counts);
}

export function mapClassDetailToRowWithCounts(
  record: ClassDetailRecord,
  counts: {
    enrollment_count: number;
    teacher_count: number;
    completed_sessions: number;
  }
): ManagerClassRow {
  return mapClassDetailRecordToRow(record, counts);
}

export function buildCountMap(rows: Array<{ class_id: string }> | null | undefined) {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }

  return counts;
}

export async function mapClassDetailRecordsToRows(
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
    image_url: record.image_url,
    enrollment_count: enrollmentCounts.get(record.id) ?? 0,
    teacher_count: teacherCounts.get(record.id) ?? 0,
    created_at: record.created_at ?? "",
  }));
}

export async function buildFullNameByUserId(
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

export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

export function isInvalidUuidError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid input syntax for type uuid") ||
    normalized.includes("22p02")
  );
}
