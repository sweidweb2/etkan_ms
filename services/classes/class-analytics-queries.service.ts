import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import {
  buildGradesByTaskId,
  computeOverallAverageTaskGrade,
  computeSessionTaskGradeSummary,
} from "@/lib/manager/class-analytics";
import { buildClassGroupGradeTrend } from "@/lib/manager/class-group-grade-analytics";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import { isAttendeePresentForRate } from "@/lib/constants/manager-attendee-status";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";
import { type Supabase } from "@/services/classes/class-shared";

export async function getClassAnalyticsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  options?: {
    sessions?: Array<{
      id: string;
      nb_order: number;
      starts_at: string;
      group_grade_level: string | null;
    }>;
    enrolledCount?: number;
    tasks?: Array<{
      id: string;
      max_grade: number | null;
      started: boolean;
      started_at: string | null;
    }>;
  }
): Promise<ManagerClassAnalyticsPreview> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW_ANALYTICS);

  const hasPreloadedSessions = options?.sessions !== undefined;
  const hasPreloadedEnrollment = typeof options?.enrolledCount === "number";
  const hasPreloadedTasks = options?.tasks !== undefined;

  const [sessionsResult, enrollmentResult, tasksResult] = await Promise.all([
    hasPreloadedSessions
      ? Promise.resolve({ data: options.sessions!, error: null })
      : sessionRepository.listSessionsByClassId(adminClient, classId),
    hasPreloadedEnrollment
      ? Promise.resolve({ count: options.enrolledCount!, error: null })
      : studentClassRepository.countStudentClassesByClassId(adminClient, classId),
    hasPreloadedTasks
      ? Promise.resolve({ data: options.tasks!, error: null })
      : classTaskRepository.listClassTasksByClassId(adminClient, classId),
  ]);

  if (!hasPreloadedSessions && sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  if (!hasPreloadedEnrollment && enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (!hasPreloadedTasks && tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const sessions = (sessionsResult.data ?? []) as Array<{
    id: string;
    nb_order: number;
    starts_at: string;
    group_grade_level: string | null;
  }>;
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
  const tasks = tasksResult.data ?? [];
  const taskIds = tasks.map((task) => task.id);

  const [attendeesResult, studentTasksResult] = await Promise.all([
    attendeeRepository.listAttendeesBySessionIds(adminClient, sessionIds),
    studentTaskRepository.listStudentTasksByTaskIds(adminClient, taskIds),
  ]);

  if (attendeesResult.error) {
    throw new Error(attendeesResult.error.message);
  }

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  const studentTasks = studentTasksResult.data ?? [];
  // Tasks are class-scoped. For the per-session trend, bucket each started
  // task into the latest session that began on/before its start (or the first
  // session when it started before any session).
  const sessionsByStart = [...sessions].sort(
    (left, right) =>
      new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
  );
  const tasksBySessionId = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.started || !task.started_at) {
      continue;
    }
    const startedMs = new Date(task.started_at).getTime();
    let bucket = sessionsByStart[0];
    for (const session of sessionsByStart) {
      if (new Date(session.starts_at).getTime() <= startedMs) {
        bucket = session;
      } else {
        break;
      }
    }
    const list = tasksBySessionId.get(bucket.id) ?? [];
    list.push(task);
    tasksBySessionId.set(bucket.id, list);
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

/** Owns the admin client for Suspense deferred class analytics sections. */
export async function loadClassAnalyticsDeferredForManager(
  actorUserId: string | null,
  classId: string,
  options?: {
    sessions?: Array<{
      id: string;
      nb_order: number;
      starts_at: string;
      group_grade_level: string | null;
    }>;
    enrolledCount?: number;
    tasks?: Array<{
      id: string;
      max_grade: number | null;
      started: boolean;
      started_at: string | null;
    }>;
  }
): Promise<ManagerClassAnalyticsPreview> {
  const adminClient = createSupabaseAdminClient();
  return getClassAnalyticsForManager(adminClient, actorUserId, classId, options);
}
