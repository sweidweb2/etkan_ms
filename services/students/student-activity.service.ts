import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAuditLogChangeSummary } from "@/lib/manager/get-audit-log-change-summary";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as auditLogRepository from "@/repositories/audit-log.repository";
import type { AuditRelatedRecordGroup } from "@/repositories/audit-log.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import {
  assertPermission,
  assertStudentSelfAccess,
} from "@/services/auth/authorization.service";
import {
  AUDIT_LOG_ACTION_VALUES,
  AUDIT_LOG_SEVERITY_VALUES,
  type AuditLogActionValue,
  type AuditLogSeverityValue,
} from "@/lib/constants/manager-audit-log-display";
import type { AuditLogRecord } from "@/repositories/audit-log.repository";
import type {
  AuditLogJsonValue,
  ManagerAuditLogRow,
} from "@/types/manager-audit-log";
import type { ManagerStudentActivityRow } from "@/types/manager-student-activity";
import type { Database, Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

const MAX_RELATED_IDS_PER_TABLE = 200;

function isAuditLogAction(value: string): value is AuditLogActionValue {
  return (AUDIT_LOG_ACTION_VALUES as readonly string[]).includes(value);
}

function isAuditLogSeverity(value: string): value is AuditLogSeverityValue {
  return (AUDIT_LOG_SEVERITY_VALUES as readonly string[]).includes(value);
}

function toJsonObject(value: Json | null): AuditLogJsonValue | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as AuditLogJsonValue;
}

function mapAuditLogRecordToRow(record: AuditLogRecord): ManagerAuditLogRow {
  return {
    id: record.id,
    user_id: record.user_id,
    user_label: record.user_label,
    action: isAuditLogAction(record.action) ? record.action : "other",
    severity: isAuditLogSeverity(record.severity) ? record.severity : "info",
    table_name: record.table_name,
    record_id: record.record_id,
    old_data: toJsonObject(record.old_data),
    new_data: toJsonObject(record.new_data),
    metadata: toJsonObject(record.metadata),
    created_at: record.created_at,
  };
}

function mapToActivityRow(record: AuditLogRecord): ManagerStudentActivityRow {
  const log = mapAuditLogRecordToRow(record);
  return {
    id: log.id,
    created_at: log.created_at,
    action: log.action,
    severity: log.severity,
    table_name: log.table_name,
    actor_label: log.user_label,
    summary: getAuditLogChangeSummary(log),
    log,
  };
}

function capIds(ids: string[]): string[] {
  return ids.slice(0, MAX_RELATED_IDS_PER_TABLE);
}

function idsFromRows(
  rows: Array<{ id: string }> | null | undefined
): string[] {
  return (rows ?? []).map((row) => row.id);
}

/**
 * Prefetch related record ids for tables that lack denormalized student keys
 * on audit rows (payments, attendees, tasks, etc.).
 */
export async function prefetchStudentRelatedAuditRecordGroups(
  adminClient: Supabase,
  studentUserId: string
): Promise<AuditRelatedRecordGroup[]> {
  const [
    sppResult,
    attendeeResult,
    taskResult,
    finalExamResult,
    enrollmentResult,
    courseGradeResult,
  ] = await Promise.all([
    studentPaymentPhaseRepository.listSppIdsByStudentId(
      adminClient,
      studentUserId
    ),
    attendeeRepository.listAttendeeIdsByStudentId(adminClient, studentUserId),
    studentTaskRepository.listStudentTaskIdsByStudentId(
      adminClient,
      studentUserId
    ),
    finalExamRepository.listStudentFinalExamGradeIdsByStudentId(
      adminClient,
      studentUserId
    ),
    studentClassRepository.listStudentClassesByUserId(
      adminClient,
      studentUserId
    ),
    studentCourseGradeRepository.listStudentCourseGradeIdsByUserId(
      adminClient,
      studentUserId
    ),
  ]);

  if (sppResult.error) {
    throw new Error(sppResult.error.message);
  }
  if (attendeeResult.error) {
    throw new Error(attendeeResult.error.message);
  }
  if (taskResult.error) {
    throw new Error(taskResult.error.message);
  }
  if (finalExamResult.error) {
    throw new Error(finalExamResult.error.message);
  }
  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }
  if (courseGradeResult.error) {
    throw new Error(courseGradeResult.error.message);
  }

  const sppIds = capIds(idsFromRows(sppResult.data));
  const [paymentResult, adjustmentResult] = await Promise.all([
    studentPaymentRepository.listPaymentIdsBySppIds(adminClient, sppIds),
    studentFinancialAdjustmentRepository.listAdjustmentIdsBySppIds(
      adminClient,
      sppIds
    ),
  ]);

  if (paymentResult.error) {
    throw new Error(paymentResult.error.message);
  }
  if (adjustmentResult.error) {
    throw new Error(adjustmentResult.error.message);
  }

  const groups: AuditRelatedRecordGroup[] = [
    { tableName: "student_payment_phases", recordIds: sppIds },
    {
      tableName: "student_payments",
      recordIds: capIds(idsFromRows(paymentResult.data)),
    },
    {
      tableName: "student_financial_adjustments",
      recordIds: capIds(idsFromRows(adjustmentResult.data)),
    },
    {
      tableName: "attendee",
      recordIds: capIds(idsFromRows(attendeeResult.data)),
    },
    {
      tableName: "student_tasks",
      recordIds: capIds(idsFromRows(taskResult.data)),
    },
    {
      tableName: "student_finalexam_grade",
      recordIds: capIds(idsFromRows(finalExamResult.data)),
    },
    {
      tableName: "student_class",
      recordIds: capIds(idsFromRows(enrollmentResult.data)),
    },
    {
      tableName: "student_course_grade",
      recordIds: capIds(idsFromRows(courseGradeResult.data)),
    },
  ];

  return groups.filter((group) => group.recordIds.length > 0);
}

async function listStudentActivityRows(
  adminClient: Supabase,
  studentUserId: string
): Promise<ManagerStudentActivityRow[]> {
  const relatedByTable = await prefetchStudentRelatedAuditRecordGroups(
    adminClient,
    studentUserId
  );

  const { data, error } =
    await auditLogRepository.listAuditLogsRelatedToStudent(adminClient, {
      studentUserId,
      relatedByTable,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapToActivityRow);
}

export async function listStudentActivityForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  studentUserId: string
): Promise<ManagerStudentActivityRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.STUDENTS_VIEW);
  return listStudentActivityRows(adminClient, studentUserId);
}

export async function listStudentActivityForSelf(
  adminClient: Supabase,
  sessionUserId: string | null
): Promise<ManagerStudentActivityRow[]> {
  const userId = await assertStudentSelfAccess(adminClient, sessionUserId);
  return listStudentActivityRows(adminClient, userId);
}
