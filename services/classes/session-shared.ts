import "server-only";

import {
  ATTENDEE_STATUSES,
  type AttendeeStatusValue,
} from "@/lib/constants/manager-attendee-status";
import {
  STUDENT_TASK_STATUSES,
  type StudentTaskStatusValue,
} from "@/lib/constants/manager-student-task-status";
import { datetimeLocalToUtcIso } from "@/lib/utils/datetime-local-to-utc-iso";
import * as authRepository from "@/repositories/auth.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import type { FieldErrors } from "@/types/auth";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type {
  ManagerClassTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";
import {
  SESSION_GROUP_GRADE_LEVELS,
  type SessionGroupGradeLevelValue,
} from "@/types/manager-session-group-grade";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { z } from "zod";

export type Supabase = SupabaseClient<Database>;

export type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

export function normalizeOptionalString(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toIsoOrNull(value?: string | null): string | null {
  return datetimeLocalToUtcIso(value);
}

export function parseTaskMaxGrade(
  value: string | number | undefined | ""
): number | null {
  if (value === "" || value === undefined) {
    return null;
  }
  return Number(value);
}

export function didTaskMaxGradeDecrease(
  previousMaxGrade: number | null,
  nextMaxGrade: number | null
): boolean {
  if (previousMaxGrade == null || nextMaxGrade == null) {
    return false;
  }
  return nextMaxGrade < previousMaxGrade;
}

export function mapGroupGradeLevel(
  value: string | null
): SessionGroupGradeLevelValue | null {
  if (
    value === SESSION_GROUP_GRADE_LEVELS.VERY_LOW ||
    value === SESSION_GROUP_GRADE_LEVELS.LOW ||
    value === SESSION_GROUP_GRADE_LEVELS.MEDIUM ||
    value === SESSION_GROUP_GRADE_LEVELS.HIGH ||
    value === SESSION_GROUP_GRADE_LEVELS.VERY_HIGH
  ) {
    return value;
  }

  return null;
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
    group_grade_level: mapGroupGradeLevel(record.group_grade_level),
    created_at: record.created_at,
  };
}

export function mapTaskRecord(record: ClassTaskRecord): ManagerClassTaskRow {
  return {
    id: record.id,
    class_id: record.class_id,
    source_subject_task_id: record.source_subject_task_id,
    title: record.title,
    description: record.description,
    period: record.period,
    max_grade: record.max_grade,
    sort_order: record.sort_order,
    started: record.started,
    started_at: record.started_at,
    due_date: record.due_date,
    created_at: record.created_at ?? "",
  };
}

export function mapStudentTaskStatus(status: string): StudentTaskStatusValue {
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

export function mapAttendeeStatus(status: string): AttendeeStatusValue {
  if (
    status === ATTENDEE_STATUSES.PRESENT ||
    status === ATTENDEE_STATUSES.ABSENT ||
    status === ATTENDEE_STATUSES.LATE ||
    status === ATTENDEE_STATUSES.EXCUSED
  ) {
    return status;
  }

  return ATTENDEE_STATUSES.PRESENT;
}

export async function buildStudentDisplayByUserId(
  adminClient: Supabase,
  userIds: string[],
  options?: { includeAuthEmails?: boolean }
): Promise<
  Map<
    string,
    { full_name: string; email: string; student_profile_id: string | null }
  >
> {
  const includeAuthEmails = options?.includeAuthEmails !== false;
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<
    string,
    { full_name: string; email: string; student_profile_id: string | null }
  >();

  if (uniqueIds.length === 0) {
    return map;
  }

  const profilesPromise = studentProfileRepository.listStudentProfilesByUserIds(
    adminClient,
    uniqueIds
  );
  const emailPromise = includeAuthEmails
    ? authRepository.listAuthEmailsByIds(adminClient, uniqueIds)
    : Promise.resolve({ data: new Map<string, string>(), error: null });

  const [profilesResult, emailResult] = await Promise.all([
    profilesPromise,
    emailPromise,
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (emailResult.error) {
    throw new Error(emailResult.error.message);
  }

  const emailById = emailResult.data;

  for (const userId of uniqueIds) {
    const profile = (profilesResult.data ?? []).find(
      (row) => row.user_id === userId
    );
    map.set(userId, {
      full_name: profile?.full_name ?? "Unknown student",
      email: emailById.get(userId) ?? "",
      student_profile_id: profile?.id ?? null,
    });
  }

  return map;
}

export function mapStudentTaskRow(
  row: StudentTaskRecord,
  displayByUserId: Map<
    string,
    { full_name: string; email: string; student_profile_id: string | null }
  >
): ManagerStudentTaskRow {
  const display = displayByUserId.get(row.student_id);

  return {
    id: row.id,
    task_id: row.task_id,
    student_id: row.student_id,
    student_profile_id: display?.student_profile_id ?? null,
    full_name: display?.full_name ?? "Unknown student",
    status: mapStudentTaskStatus(row.status),
    submitted_at: row.submitted_at,
    grade: row.grade,
    notes: row.notes,
    student_report: row.student_report,
    graded_at: row.graded_at,
  };
}
