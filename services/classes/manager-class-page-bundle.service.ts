import "server-only";

import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { EMPTY_CLASS_WEEK_SKIP_STATE } from "@/lib/manager/class-week-skips";
import type { RoleValue } from "@/lib/constants/roles";
import { hasPermissionInSet } from "@/services/auth/authorization.service";
import {
  getClassForManager,
  loadAssignedClassTeachers,
  loadClassFinalExam,
  loadClassSessions,
  loadClassStudentsPage,
} from "@/services/classes/class-queries.service";
import { CLASS_STUDENTS_PAGE_SIZE } from "@/lib/constants/manager-class-student-display";
import { getClassComputedGradeLockState } from "@/services/classes/class-computed-grade-lock.service";
import { getClassWeekSkipState } from "@/services/classes/class-session-skip.service";
import { loadClassTasks } from "@/services/classes/session-queries.service";
import { resolveClassRosterOptions } from "@/lib/manager/class-roster-mode";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerClassTaskRow } from "@/types/manager-class-session-detail";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassTeacherOption } from "@/types/manager-class-detail";
import type { ClassWeekSkipState } from "@/lib/manager/class-week-skips";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ManagerClassPageBundle = {
  classRow: ManagerClassRow;
  sessions: ManagerClassSessionRow[];
  weekSkipState: ClassWeekSkipState;
  students: ManagerClassStudentRow[];
  studentsTotalCount: number;
  tasks: ManagerClassTaskRow[];
  teachers: ManagerClassTeacherOption[];
  finalExam: ManagerClassFinalExamRow | null;
  studentGrades: ManagerStudentFinalExamGradeRow[];
  hasComputedGrades: boolean;
  lockedUserIds: string[];
  canSessions: boolean;
  canStudents: boolean;
  canTasks: boolean;
  canAnalytics: boolean;
};

/**
 * One CLASSES_VIEW assert + parallel detail load for the manager class page.
 * Permission gates for optional sections come from the session pack.
 */
export async function getManagerClassPageBundle(
  adminClient: Supabase,
  input: {
    classId: string;
    actorUserId: string | null;
    actorRole: RoleValue | null;
    permissions: ReadonlySet<PermissionKey>;
  }
): Promise<ManagerClassPageBundle | null> {
  const { classId, actorUserId, actorRole, permissions } = input;

  const canSessions = hasPermissionInSet(
    permissions,
    PERMISSIONS.SESSIONS_VIEW
  );
  const canStudents = hasPermissionInSet(permissions, PERMISSIONS.CLASSES_VIEW);
  const canFinalExam = hasPermissionInSet(
    permissions,
    PERMISSIONS.FINAL_EXAMS_VIEW
  );
  const canAnalytics = hasPermissionInSet(
    permissions,
    PERMISSIONS.CLASSES_VIEW_ANALYTICS
  );
  const canGrades = hasPermissionInSet(permissions, PERMISSIONS.GRADES_VIEW);
  const canTasks = hasPermissionInSet(permissions, PERMISSIONS.TASKS_VIEW);

  const timer = createNavStepTimer("class_detail");

  const classRowBase = await timer.step("class", () =>
    getClassForManager(adminClient, actorUserId, classId, {
      includeCounts: false,
    })
  );

  if (!classRowBase) {
    return null;
  }

  const [
    sessions,
    studentsPage,
    finalExamBundle,
    teachers,
    computedGradeLock,
    tasks,
  ] = await Promise.all([
    timer.step("sessions", () =>
      canSessions
        ? loadClassSessions(adminClient, classId)
        : Promise.resolve([])
    ),
    timer.step("students", () =>
      canStudents
        ? loadClassStudentsPage(
            adminClient,
            classId,
            { page: 1, pageSize: CLASS_STUDENTS_PAGE_SIZE },
            resolveClassRosterOptions({
              mode: "managerDetail",
              semesterId: classRowBase.semester_id,
            })
          )
        : Promise.resolve({
            students: [] as ManagerClassStudentRow[],
            totalCount: 0,
            page: 1,
            pageSize: CLASS_STUDENTS_PAGE_SIZE,
            search: "",
          })
    ),
    timer.step("finalExam", () =>
      canFinalExam
        ? loadClassFinalExam(adminClient, classId)
        : Promise.resolve({ finalExam: null, studentGrades: [] })
    ),
    timer.step("teachers", () =>
      loadAssignedClassTeachers(adminClient, classId)
    ),
    timer.step("gradeLock", () =>
      canGrades
        ? getClassComputedGradeLockState(adminClient, classId)
        : Promise.resolve({ hasComputedGrades: false, lockedUserIds: [] })
    ),
    timer.step("tasks", () =>
      canTasks ? loadClassTasks(adminClient, classId) : Promise.resolve([])
    ),
  ]);

  const weekSkipState = await timer.step("weekSkips", () =>
    canSessions
      ? getClassWeekSkipState(adminClient, {
          classId,
          actorRole,
          sessions,
          classDetail: {
            name: classRowBase.name,
            status: classRowBase.status,
            plannedSessions: classRowBase.subject_nb_sessions,
          },
          hasComputedGrades: computedGradeLock.hasComputedGrades,
        })
      : Promise.resolve(EMPTY_CLASS_WEEK_SKIP_STATE)
  );
  timer.end();

  const students = studentsPage.students;
  const studentsTotalCount = studentsPage.totalCount;

  const classRow: ManagerClassRow = {
    ...classRowBase,
    enrollment_count: canStudents
      ? studentsTotalCount
      : classRowBase.enrollment_count,
    teacher_count: teachers.length,
    completed_sessions: canSessions
      ? sessions.length
      : classRowBase.completed_sessions,
  };

  return {
    classRow,
    sessions,
    weekSkipState,
    students,
    studentsTotalCount,
    tasks,
    teachers,
    finalExam: finalExamBundle.finalExam,
    studentGrades: finalExamBundle.studentGrades,
    hasComputedGrades: computedGradeLock.hasComputedGrades,
    lockedUserIds: computedGradeLock.lockedUserIds,
    canSessions,
    canStudents,
    canTasks,
    canAnalytics,
  };
}
