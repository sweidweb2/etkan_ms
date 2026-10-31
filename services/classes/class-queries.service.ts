import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import {
  buildGradesByTaskId,
  computeOverallAverageTaskGrade,
  computeSessionTaskGradeSummary,
} from "@/lib/manager/class-analytics";
import { buildClassGroupGradeTrend } from "@/lib/manager/class-group-grade-analytics";
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
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import { isAttendeePresentForRate } from "@/lib/constants/manager-attendee-status";
import {
  CLASS_GRADES_LOCKED_ERROR,
  isClassGradesUnlocked,
} from "@/lib/manager/class-grades-access";
import { listStudentsForManager } from "@/services/students/student.service";
import type { ManagerClassAnalyticsPreview } from "@/types/manager-class-analytics";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import {
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import type {
  ManagerClassesListData,
  ManagerClassesListQuery,
  ManagerClassRow,
  ManagerClassStatusCounts,
} from "@/types/manager-class-list";
import { resolveActiveStudentDiff } from "@/services/classes/class-enrollment.service";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  ManagerClassTeacherOption,
  ManagerClassTeacherSelectOption,
} from "@/types/manager-class-detail";
import type { ManagerStudentRow } from "@/types/manager-student";
import {
  buildFullNameByUserId,
  isInvalidUuidError,
  isUuid,
  loadClassDetailCounts,
  mapClassDetailRecordToRow,
  mapClassDetailRecordsToRows,
  mapClassDetailToRow,
  mapFinalExamRecord,
  mapSessionRecord,
  mapStudentFinalExamGradeRecord,
  type Supabase,
} from "@/services/classes/class-shared";

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

const CLASSES_LIST_PAGE_SIZE = 6;
const CLASSES_LIST_MAX_PAGE_SIZE = 48;

/**
 * One page of classes for the manager list. Enrollment/teacher/session counts
 * are computed only for the rows on this page.
 */
export async function listClassesPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  query: ManagerClassesListQuery = {}
): Promise<ManagerClassesListData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const pageSize = Math.min(
    CLASSES_LIST_MAX_PAGE_SIZE,
    Math.max(1, query.pageSize ?? CLASSES_LIST_PAGE_SIZE)
  );
  const page = Math.max(1, query.page ?? 1);
  const status = query.status ?? null;
  const semesterId = query.semesterId ?? null;
  const unlinkedSemester = !semesterId && (query.unlinkedSemester ?? false);
  const search = query.search?.trim() ?? "";

  const [pageResult, countsResult] = await Promise.all([
    classRepository.listClassDetailsPage(adminClient, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
      status: status ?? undefined,
      semesterId: semesterId ?? undefined,
      unlinkedSemester,
      search,
    }),
    classRepository.countClassesByStatuses(adminClient, CLASS_STATUS_VALUES),
  ]);

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }
  if (countsResult.error) {
    throw new Error(countsResult.error.message);
  }

  const records = (pageResult.data ?? []) as unknown as ClassDetailRecord[];
  const classes = await mapClassDetailRecordsToRows(adminClient, records);

  const statusCounts = Object.fromEntries(
    CLASS_STATUS_VALUES.map((value) => [
      value,
      countsResult.data?.[value] ?? 0,
    ])
  ) as ManagerClassStatusCounts;

  return {
    classes,
    totalCount: pageResult.count ?? classes.length,
    page,
    pageSize,
    status,
    semesterId,
    unlinkedSemester,
    search,
    statusCounts,
  };
}

/** Semester filter options for the manage-classes panel (no class scan). */
export async function listClassSemesterFilterOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ManagerClassSemesterOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const { data, error } = await semesterRepository.listSemesters(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((semester) => ({
    id: semester.id,
    name: semester.name,
  }));
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
    profileRepository.listInstructorProfileOptions(adminClient),
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
    })),
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
  classId: string,
  options?: { classRow?: ManagerClassRow }
): Promise<
  | { ok: true; classRow: ManagerClassRow }
  | { ok: false; error: string }
> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  if (!isUuid(classId)) {
    return { ok: false, error: "Class not found." };
  }

  // Skip the second class detail fetch when the page already loaded the row.
  if (options?.classRow && options.classRow.id === classId) {
    if (!isClassGradesUnlocked(options.classRow.status)) {
      return { ok: false, error: CLASS_GRADES_LOCKED_ERROR };
    }
    return { ok: true, classRow: options.classRow };
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

  const teachersResult =
    await profileRepository.listInstructorProfileOptions(adminClient);

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

  const knownIds = new Set(teachers.map((teacher) => teacher.id));
  const missingAssignedIds = [...assignmentByTeacherId.keys()].filter(
    (teacherId) => !knownIds.has(teacherId)
  );

  let assignedOutsideCatalog: ManagerClassTeacherSelectOption[] = [];
  if (missingAssignedIds.length > 0) {
    const extraResult = await profileRepository.listProfileOptionsByIds(
      adminClient,
      missingAssignedIds
    );

    if (extraResult.error) {
      throw new Error(extraResult.error.message);
    }

    assignedOutsideCatalog = (extraResult.data ?? []).map((teacher) => ({
      id: teacher.id,
      username: teacher.username,
    }));
  }

  return [...teachers, ...assignedOutsideCatalog].map((teacher) => ({
    id: teacher.id,
    username: teacher.username,
    assigned: assignmentByTeacherId.has(teacher.id),
    assignment_id: assignmentByTeacherId.get(teacher.id) ?? null,
  }));
}

/** Slim id/name options for transfer dialogs (no enrollment/teacher/session counts). */
export async function listClassTransferOptionsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  excludeClassId: string
): Promise<Array<{ id: string; name: string }>> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  const { data, error } =
    await classRepository.listClassesWithSubjectForPicker(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => row.id !== excludeClassId)
    .map((row) => ({ id: row.id, name: row.name }));
}

/** Assigned teachers only — for class detail shell before the assign dropdown opens. */
export async function listAssignedClassTeachersForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ManagerClassTeacherOption[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);

  if (!isUuid(classId)) {
    return [];
  }

  const assignmentsResult =
    await classTeacherRepository.listClassTeachersByClassId(
      adminClient,
      classId
    );

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignments = assignmentsResult.data ?? [];
  if (assignments.length === 0) {
    return [];
  }

  const teacherIds = assignments.map((row) => row.teacher_id);
  const profilesResult = await profileRepository.listProfileOptionsByIds(
    adminClient,
    teacherIds
  );

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row])
  );
  const assignmentByTeacherId = new Map(
    assignments.map((row) => [row.teacher_id, row.id])
  );

  return teacherIds.flatMap((teacherId) => {
    const profile = profileById.get(teacherId);
    if (!profile) {
      return [];
    }
    return [
      {
        id: profile.id,
        username: profile.username,
        assigned: true,
        assignment_id: assignmentByTeacherId.get(teacherId) ?? null,
      },
    ];
  });
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
  await assertPermission(adminClient, actorUserId, PERMISSIONS.CLASSES_VIEW);
  return loadClassStudentRows(adminClient, classId);
}

export type LoadClassStudentRowsOptions = {
  /**
   * Resolve Auth Admin emails (N `getUserById` for ≤50 students).
   * Teacher roster skips this — name/username are enough for search/display.
   * @default true
   */
  includeAuthEmails?: boolean;
};

/**
 * Same rows as `listClassStudentsForManager` without the permission check.
 * Only for callers that already asserted `CLASSES_VIEW` (and class scope, e.g.
 * teacher assignment) earlier in the same request.
 */
export async function loadClassStudentRows(
  adminClient: Supabase,
  classId: string,
  options?: LoadClassStudentRowsOptions
): Promise<ManagerClassStudentRow[]> {
  const includeAuthEmails = options?.includeAuthEmails !== false;
  const timer = createNavStepTimer("class_students");
  try {
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
          includeAuthEmails
            ? authRepository.listAuthEmailsByIds(adminClient, userIds)
            : Promise.resolve({
                data: new Map<string, string>(),
                error: null as Error | null,
              }),
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

export type ClassCopySourceOption = {
  id: string;
  name: string;
  status: ClassStatusValue;
};

export async function listSameSemesterClassesForCopy(
  adminClient: Supabase,
  actorUserId: string | null,
  targetClassId: string
): Promise<ClassCopySourceOption[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS
  );

  if (!isUuid(targetClassId)) {
    return [];
  }

  const targetResult = await classRepository.findClassById(
    adminClient,
    targetClassId
  );

  if (targetResult.error) {
    throw new Error(targetResult.error.message);
  }

  const semesterId = targetResult.data?.semester_id;
  if (!semesterId) {
    return [];
  }

  const { data, error } = await classRepository.listClassesBySemesterId(
    adminClient,
    semesterId
  );

  if (error) {
    throw new Error(error.message);
  }

  const statusSet = new Set<string>(CLASS_STATUS_VALUES);

  return (data ?? [])
    .filter((row) => row.id !== targetClassId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: (statusSet.has(row.status ?? "")
        ? row.status
        : CLASS_STATUS_VALUES[0]) as ClassStatusValue,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listActiveStudentDiffFromClass(
  adminClient: Supabase,
  actorUserId: string | null,
  targetClassId: string,
  sourceClassId: string
): Promise<ManagerStudentRow[]> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS
  );

  if (!isUuid(targetClassId) || !isUuid(sourceClassId)) {
    return [];
  }

  const result = await resolveActiveStudentDiff(
    adminClient,
    targetClassId,
    sourceClassId
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.students;
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
    classTaskRepository.listClassTasksByClassId(adminClient, classId),
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
