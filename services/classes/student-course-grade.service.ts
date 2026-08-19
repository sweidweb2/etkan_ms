import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { isAttendeePresentForRate } from "@/lib/constants/manager-attendee-status";
import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import { roundGrade } from "@/lib/compute/custom-compute-form-utils";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import {
  computeStudentTaskTotalGrade,
  computeWeightedCourseTotalGrade,
  normalizeFinalExamGradeForCompute,
} from "@/lib/manager/compute-student-course-grade";
import { buildStudentGroupGradeSlots } from "@/lib/manager/class-group-grade-analytics";
import {
  buildStudentGradeMissingItems,
  hasStudentGradeMissingItems,
} from "@/lib/manager/student-grade-missing-items";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import type {
  FinalExamRecord,
  StudentFinalExamGradeRecord,
} from "@/repositories/final-exam.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import type {
  StudentCourseGradeRecord,
  UpsertStudentCourseGradeInput,
} from "@/repositories/student-course-grade.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertClassGradesUnlockedForManager,
  fetchClassStudentRowForManager,
  listClassStudentsForManager,
} from "@/services/classes/class.service";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type {
  ManagerStudentAttendeeGradeEntry,
  ManagerStudentCourseGrade,
  ManagerStudentGroupGradeEntry,
  ManagerStudentTaskGradeWeightRow,
} from "@/types/manager-student-course-grade";
import type {
  ManagerStudentClassAcademicBundle,
  ManagerStudentClassTabDetail,
  ManagerStudentClassTaskRow,
} from "@/types/manager-student-class-detail";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type ClassGradeContext = {
  sessions: SessionRecord[];
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: FinalExamRecord | null;
  finalExamMaxGrade: number | null;
  finalExamGradesByUserId: Map<string, StudentFinalExamGradeRecord>;
  studentTasksByUserId: Map<string, StudentTaskRecord[]>;
  storedGradesByUserId: Map<string, StudentCourseGradeRecord>;
  attendeeStatusMapsByUserId: Map<string, Map<string, string>>;
};

type ComputeGradeOptions = {
  factorWeights?: FactorWeightsValues;
  taskWeights?: Record<string, string>;
  computeType?: string;
  computeLabel?: string;
};

const COMPUTE_ALL_SAVE_CHUNK = 8;

export type ComputedStudentGradeSheetBundle = {
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
};

function parseTaskJsonGradeWeights(
  value: Json | null
): ManagerStudentTaskGradeWeightRow[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const row = entry as Record<string, unknown>;
    if (typeof row.key !== "string") {
      return [];
    }

    return [
      {
        key: row.key,
        label: typeof row.label === "string" ? row.label : row.key,
        weight: Number(row.weight ?? 0),
      },
    ];
  });
}

function taskWeightsFromJson(
  entries: ManagerStudentTaskGradeWeightRow[]
): Record<string, number> {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.weight]));
}

function buildTaskWeightPayload(
  classTasks: ManagerClassTaskForGradesRow[],
  taskWeights: Record<string, string>
): Json {
  return classTasks.map((task) => ({
    key: task.id,
    label: `${task.session_label} · ${task.title}`,
    weight: Number(taskWeights[task.id] ?? 0),
  })) as Json;
}

function resolveFactorWeights(options?: ComputeGradeOptions): FactorWeightsValues {
  return {
    group_weight: 0,
    attendee_weight: 0,
    tasks_weight:
      options?.factorWeights?.tasks_weight ?? DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
    final_exam_weight:
      options?.factorWeights?.final_exam_weight ??
      DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  };
}

function buildClassTaskRows(
  sessions: SessionRecord[],
  tasks: Array<{
    id: string;
    session_id: string | null;
    title?: string;
    max_grade: number | null;
    due_date?: string | null;
    created_at?: string | null;
  }>
): ManagerClassTaskForGradesRow[] {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const rows: ManagerClassTaskForGradesRow[] = [];

  for (const task of tasks) {
    const session = task.session_id
      ? sessionById.get(task.session_id)
      : undefined;

    if (!session) {
      rows.push({
        id: task.id,
        session_id: task.session_id,
        session_label: "Unassigned",
        session_nb_order: Number.MAX_SAFE_INTEGER,
        title: task.title ?? "Task",
        max_grade: task.max_grade,
        due_date: task.due_date ?? null,
        created_at: task.created_at ?? null,
      });
      continue;
    }

    rows.push({
      id: task.id,
      session_id: task.session_id,
      session_label: `S${session.nb_order}`,
      session_nb_order: session.nb_order,
      title: task.title ?? "Task",
      max_grade: task.max_grade,
      due_date: task.due_date ?? null,
      created_at: task.created_at ?? null,
    });
  }

  return rows.sort((left, right) => {
    const sessionCompare = left.session_nb_order - right.session_nb_order;
    if (sessionCompare !== 0) {
      return sessionCompare;
    }

    return (
      new Date(left.created_at ?? 0).getTime() -
      new Date(right.created_at ?? 0).getTime()
    );
  });
}

async function loadClassGradeContext(
  adminClient: Supabase,
  classId: string
): Promise<ClassGradeContext> {
  const sessionsResult = await sessionRepository.listSessionsByClassId(
    adminClient,
    classId
  );

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }

  const sessions = (sessionsResult.data ?? []) as SessionRecord[];
  const sessionIds = sessions.map((session) => session.id);

  const [tasksResult, finalExamResult, storedGradesResult, attendeesResult] =
    await Promise.all([
      taskRepository.listTasksForGradesBySessionIds(adminClient, sessionIds),
      finalExamRepository.findFinalExamByClassId(adminClient, classId),
      studentCourseGradeRepository.listStudentCourseGradesByClassId(
        adminClient,
        classId
      ),
      attendeeRepository.listAttendeesBySessionIds(adminClient, sessionIds),
    ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  if (finalExamResult.error) {
    throw new Error(finalExamResult.error.message);
  }

  if (storedGradesResult.error) {
    throw new Error(storedGradesResult.error.message);
  }

  if (attendeesResult.error) {
    throw new Error(attendeesResult.error.message);
  }

  const classTasks = buildClassTaskRows(
    sessions,
    (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      session_id: task.session_id,
      title: task.title,
      max_grade: task.max_grade,
      due_date: task.due_date,
      created_at: task.created_at,
    }))
  );

  const taskIds = classTasks.map((task) => task.id);
  const finalExam = (finalExamResult.data as FinalExamRecord | null) ?? null;

  const [studentTasksResult, examGradesResult] = await Promise.all([
    studentTaskRepository.listStudentTasksForGradesByTaskIds(
      adminClient,
      taskIds
    ),
    finalExam
      ? finalExamRepository.listStudentFinalExamGradesByFinalExamId(
          adminClient,
          finalExam.id
        )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  if (examGradesResult.error) {
    throw new Error(examGradesResult.error.message);
  }

  const finalExamGradesByUserId = new Map(
    ((examGradesResult.data ?? []) as StudentFinalExamGradeRecord[]).map(
      (row) => [row.student_id, row]
    )
  );

  const studentTasksByUserId = new Map<string, StudentTaskRecord[]>();

  for (const row of studentTasksResult.data ?? []) {
    const list = studentTasksByUserId.get(row.student_id) ?? [];
    list.push(row);
    studentTasksByUserId.set(row.student_id, list);
  }

  const storedGradesByUserId = new Map(
    ((storedGradesResult.data ?? []) as StudentCourseGradeRecord[]).map(
      (row) => [row.user_id, row]
    )
  );

  return {
    sessions,
    classTasks,
    finalExam,
    finalExamMaxGrade: finalExam?.max_grade ?? null,
    finalExamGradesByUserId,
    studentTasksByUserId,
    storedGradesByUserId,
    attendeeStatusMapsByUserId: buildAttendeeStatusMapsByUserId(
      attendeesResult.data ?? []
    ),
  };
}

function mapStoredGradeRow(
  student: Awaited<ReturnType<typeof listClassStudentsForManager>>[number],
  stored: StudentCourseGradeRecord
): ManagerClassStudentGradeRow {
  const taskWeightEntries = parseTaskJsonGradeWeights(
    stored.task_json_grade_weights
  );

  const totalGrade = computeWeightedCourseTotalGrade({
    taskTotalGrade:
      stored.task_total_grade == null ? null : Number(stored.task_total_grade),
    finalExamGrade:
      stored.final_exam_grade == null ? null : Number(stored.final_exam_grade),
    tasksWeight: Number(stored.task_weight ?? DEFAULT_CLASS_GRADE_TASKS_WEIGHT),
    finalExamWeight: Number(
      stored.final_exam_weight ?? DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT
    ),
  });

  return {
    student_profile_id: student.student_profile_id,
    user_id: student.user_id,
    full_name: student.full_name,
    username: student.username,
    email: student.email,
    phone: student.phone,
    enrollment_status: "Member",
    is_computed: true,
    total_grade: totalGrade,
    task_total_grade:
      stored.task_total_grade == null ? null : Number(stored.task_total_grade),
    final_exam_grade:
      stored.final_exam_grade == null ? null : Number(stored.final_exam_grade),
    course_grade_id: stored.id,
    compute_type: stored.type,
    stored_tasks_weight:
      stored.task_weight == null ? null : Number(stored.task_weight),
    stored_final_exam_weight:
      stored.final_exam_weight == null ? null : Number(stored.final_exam_weight),
    stored_task_weights: taskWeightsFromJson(taskWeightEntries),
    missing_items: [],
  };
}

function mapPendingGradeRow(
  student: Awaited<ReturnType<typeof listClassStudentsForManager>>[number],
  context: ClassGradeContext
): ManagerClassStudentGradeRow {
  const studentTasks = context.studentTasksByUserId.get(student.user_id) ?? [];
  const taskTotalGrade = computeStudentTaskTotalGrade(
    context.classTasks,
    studentTasks,
    buildDefaultTaskWeightsForClass(context.classTasks)
  );
  const finalExamGradeRecord =
    context.finalExamGradesByUserId.get(student.user_id) ?? null;
  const finalExamGrade = normalizeFinalExamGradeForCompute(
    finalExamGradeRecord?.grade ?? null,
    finalExamGradeRecord?.status,
    context.finalExamMaxGrade
  );
  const missingItems = buildStudentGradeMissingItems({
    classTasks: context.classTasks,
    studentTasks,
    finalExam: context.finalExam
      ? {
          id: context.finalExam.id,
          title: context.finalExam.title,
          max_grade: context.finalExam.max_grade,
          due_date: context.finalExam.due_date,
        }
      : null,
    finalExamGrade: finalExamGradeRecord,
  });

  return {
    student_profile_id: student.student_profile_id,
    user_id: student.user_id,
    full_name: student.full_name,
    username: student.username,
    email: student.email,
    phone: student.phone,
    enrollment_status: "Member",
    is_computed: false,
    total_grade: null,
    task_total_grade: taskTotalGrade,
    final_exam_grade: finalExamGrade,
    missing_items: missingItems,
  };
}

function parseGroupGradesJson(value: Json | null): ManagerStudentGroupGradeEntry[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const row = entry as Record<string, unknown>;
    if (typeof row.session_id !== "string" || row.grade == null) {
      return [];
    }

    return [
      {
        session_id: row.session_id,
        session_label:
          typeof row.session_label === "string" ? row.session_label : undefined,
        grade: Number(row.grade),
      },
    ];
  });
}

function parseAttendeeGradesJson(
  value: Json | null
): ManagerStudentAttendeeGradeEntry[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const row = entry as Record<string, unknown>;
    if (typeof row.session_id !== "string") {
      return [];
    }

    return [
      {
        session_id: row.session_id,
        session_label:
          typeof row.session_label === "string" ? row.session_label : undefined,
        grade: row.grade == null ? null : Number(row.grade),
        status: typeof row.status === "string" ? row.status : undefined,
      },
    ];
  });
}

function mapStoredCourseGrade(
  stored: StudentCourseGradeRecord
): ManagerStudentCourseGrade {
  return {
    id: stored.id,
    task_json_grade_weights: parseTaskJsonGradeWeights(
      stored.task_json_grade_weights
    ),
    group_grades_json: parseGroupGradesJson(stored.group_grades_json),
    attendee_grades_json: parseAttendeeGradesJson(stored.attendee_grades_json),
    task_weight: stored.task_weight == null ? null : Number(stored.task_weight),
    task_total_grade:
      stored.task_total_grade == null ? null : Number(stored.task_total_grade),
    final_exam_grade:
      stored.final_exam_grade == null ? null : Number(stored.final_exam_grade),
    final_exam_weight:
      stored.final_exam_weight == null ? null : Number(stored.final_exam_weight),
    type: stored.type,
    created_at: stored.created_at ?? "",
  };
}

function mapStudentTaskStatus(status: string): StudentTaskStatusValue {
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

function buildStudentAttendanceDetail(
  sessions: SessionRecord[],
  attendeeStatusBySessionId: Map<string, string>
): Pick<ManagerStudentClassTabDetail, "attendanceSlots" | "attendanceTrend"> {
  const sortedSessions = [...sessions].sort(
    (left, right) => left.nb_order - right.nb_order
  );

  let cumulativePresent = 0;
  let streak = 0;

  const attendanceSlots = sortedSessions.map((session) => {
    const attendeeStatus = attendeeStatusBySessionId.get(session.id);
    const isPresent = attendeeStatus
      ? isAttendeePresentForRate(attendeeStatus)
      : false;

    return {
      session_id: session.id,
      session_label: `S${session.nb_order}`,
      session_at: session.starts_at,
      status: isPresent
        ? STUDENT_ATTENDANCE_STATUSES.PRESENT
        : STUDENT_ATTENDANCE_STATUSES.ABSENT,
    };
  });

  const attendanceTrend = attendanceSlots.map((slot) => {
    if (slot.status === STUDENT_ATTENDANCE_STATUSES.PRESENT) {
      cumulativePresent += 1;
      streak += 1;
    } else {
      streak = 0;
    }

    return {
      session_label: slot.session_label,
      cumulative_present: cumulativePresent,
      cumulative_rate:
        attendanceSlots.length === 0
          ? 0
          : Math.round((cumulativePresent / attendanceSlots.length) * 100),
      streak,
    };
  });

  return { attendanceSlots, attendanceTrend };
}

function buildStudentTaskDetail(
  classTasks: ManagerClassTaskForGradesRow[],
  studentTasks: StudentTaskRecord[]
): Pick<ManagerStudentClassTabDetail, "tasks" | "taskGradeTrend"> {
  const studentTaskByTaskId = new Map(
    studentTasks.map((row) => [row.task_id, row])
  );

  const tasks: ManagerStudentClassTaskRow[] = classTasks.map((task) => {
    const studentTask = studentTaskByTaskId.get(task.id);

    return {
      student_task_id: studentTask?.id ?? `pending-${task.id}`,
      task_id: task.id,
      session_id: task.session_id,
      session_label: task.session_label,
      title: task.title,
      due_date: task.due_date,
      max_grade: task.max_grade ?? 0,
      status: mapStudentTaskStatus(studentTask?.status ?? STUDENT_TASK_STATUSES.PENDING),
      grade: studentTask?.grade ?? null,
      submitted_at: studentTask?.submitted_at ?? null,
      graded_at: studentTask?.graded_at ?? null,
    };
  });

  const taskGradeTrend = tasks.flatMap((task) => {
    if (task.grade == null || !task.graded_at) {
      return [];
    }

    return [
      {
        task_label: task.title,
        grade: task.grade,
        max_grade: task.max_grade,
        graded_at: task.graded_at,
      },
    ];
  });

  return { tasks, taskGradeTrend };
}

function buildStudentClassTabDetail(
  context: ClassGradeContext,
  userId: string,
  attendeeStatusBySessionId: Map<string, string>
): ManagerStudentClassTabDetail {
  const stored = context.storedGradesByUserId.get(userId);
  const studentTasks = context.studentTasksByUserId.get(userId) ?? [];

  return {
    ...buildStudentAttendanceDetail(context.sessions, attendeeStatusBySessionId),
    groupGradeSlots: buildStudentGroupGradeSlots(context.sessions),
    ...buildStudentTaskDetail(context.classTasks, studentTasks),
    courseGrade: stored ? mapStoredCourseGrade(stored) : null,
  };
}

export async function getStudentClassGradeDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  studentProfileId: string
): Promise<{
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
} | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const student = students.find(
    (row) => row.student_profile_id === studentProfileId
  );

  if (!student) {
    return null;
  }

  const attendeeStatusBySessionId =
    context.attendeeStatusMapsByUserId.get(student.user_id) ??
    new Map<string, string>();

  const stored = context.storedGradesByUserId.get(student.user_id);
  const gradeRow = stored
    ? mapStoredGradeRow(student, stored)
    : mapPendingGradeRow(student, context);

  return {
    student,
    gradeRow,
    detail: buildStudentClassTabDetail(
      context,
      student.user_id,
      attendeeStatusBySessionId
    ),
    classTasks: context.classTasks,
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
  };
}

export async function getStudentClassAcademicDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  userId: string
): Promise<{
  detail: ManagerStudentClassTabDetail;
  finalExam: ManagerClassFinalExamRow | null;
  studentFinalExamGrade: ManagerStudentFinalExamGradeRow | null;
}> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const enrollmentResult = await studentClassRepository.findStudentClassByUserAndClass(
    adminClient,
    userId,
    classId
  );

  if (enrollmentResult.error) {
    throw new Error(enrollmentResult.error.message);
  }

  if (!enrollmentResult.data) {
    throw new Error("Student is not a member of this class.");
  }

  const [context, profilesResult] = await Promise.all([
    loadClassGradeContext(adminClient, classId),
    studentProfileRepository.listStudentProfilesByUserIds(adminClient, [userId]),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const attendeeStatusBySessionId =
    context.attendeeStatusMapsByUserId.get(userId) ??
    new Map<string, string>();
  const fullName =
    (profilesResult.data ?? []).find((row) => row.user_id === userId)
      ?.full_name ?? "Unknown student";
  const examGradeRecord =
    context.finalExamGradesByUserId.get(userId) ?? null;

  return {
    detail: buildStudentClassTabDetail(
      context,
      userId,
      attendeeStatusBySessionId
    ),
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
    studentFinalExamGrade: examGradeRecord
      ? mapStudentFinalExamGradeForBundle(examGradeRecord, fullName)
      : null,
  };
}

function mapFinalExamForStudentBundle(
  record: FinalExamRecord
): ManagerClassFinalExamRow {
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

function mapStudentFinalExamGradeForBundle(
  record: StudentFinalExamGradeRecord,
  fullName: string
): ManagerStudentFinalExamGradeRow {
  return {
    id: record.id,
    final_exam_id: record.final_exam_id,
    student_id: record.student_id,
    full_name: fullName,
    status: mapStudentTaskStatus(record.status),
    submitted_at: record.submitted_at,
    grade: record.grade === null ? null : Number(record.grade),
    notes: record.notes,
    graded_at: record.graded_at,
    created_at: record.created_at,
  };
}

/**
 * One batched academic load for student detail (all joined classes).
 * Asserts grades + final-exams once; student-scoped queries only.
 */
export async function listStudentClassAcademicBundlesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  studentUserId: string,
  joinedClasses: ManagerStudentClassRow[]
): Promise<ManagerStudentClassAcademicBundle[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);
  await assertPermission(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_VIEW);

  if (joinedClasses.length === 0) {
    return [];
  }

  const classIds = joinedClasses.map((row) => row.class_id);

  const [sessionsResult, finalExamsResult, courseGradesResult] =
    await Promise.all([
      sessionRepository.listSessionsByClassIds(adminClient, classIds),
      finalExamRepository.listFinalExamsByClassIds(adminClient, classIds),
      studentCourseGradeRepository.listStudentCourseGradesByUserAndClassIds(
        adminClient,
        studentUserId,
        classIds
      ),
    ]);

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message);
  }
  if (finalExamsResult.error) {
    throw new Error(finalExamsResult.error.message);
  }
  if (courseGradesResult.error) {
    throw new Error(courseGradesResult.error.message);
  }

  const sessions = (sessionsResult.data ?? []) as SessionRecord[];
  const sessionsByClassId = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const list = sessionsByClassId.get(session.class_id) ?? [];
    list.push(session);
    sessionsByClassId.set(session.class_id, list);
  }

  const sessionIds = sessions.map((session) => session.id);
  const finalExams = (finalExamsResult.data ?? []) as FinalExamRecord[];
  const finalExamByClassId = new Map(
    finalExams.map((exam) => [exam.class_id, exam])
  );
  const finalExamIds = finalExams.map((exam) => exam.id);

  const [tasksResult, attendeesResult, finalExamGradesResult] =
    await Promise.all([
      taskRepository.listTasksForGradesBySessionIds(adminClient, sessionIds),
      attendeeRepository.listAttendeesBySessionIdsAndStudentId(
        adminClient,
        sessionIds,
        studentUserId
      ),
      finalExamRepository.listStudentFinalExamGradesByStudentAndFinalExamIds(
        adminClient,
        studentUserId,
        finalExamIds
      ),
    ]);

  if (tasksResult.error) {
    throw new Error(tasksResult.error.message);
  }

  const allTasks = tasksResult.data ?? [];
  const taskIds = allTasks.map((task) => task.id);
  const studentTasksResult =
    await studentTaskRepository.listStudentTasksForGradesByTaskIdsAndStudentId(
      adminClient,
      taskIds,
      studentUserId
    );

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }
  if (attendeesResult.error) {
    throw new Error(attendeesResult.error.message);
  }
  if (finalExamGradesResult.error) {
    throw new Error(finalExamGradesResult.error.message);
  }

  const studentTasks = (studentTasksResult.data ?? []) as StudentTaskRecord[];
  const studentTasksByTaskId = new Map(
    studentTasks.map((row) => [row.task_id, row])
  );

  const attendeeStatusBySessionId = new Map<string, string>();
  for (const row of attendeesResult.data ?? []) {
    attendeeStatusBySessionId.set(row.session_id, row.status);
  }

  const courseGradeByClassId = new Map(
    ((courseGradesResult.data ?? []) as StudentCourseGradeRecord[]).map(
      (row) => [row.class_id, row]
    )
  );

  const finalExamGradeByExamId = new Map(
    ((finalExamGradesResult.data ?? []) as StudentFinalExamGradeRecord[]).map(
      (row) => [row.final_exam_id, row]
    )
  );

  const tasksBySessionId = new Map<string, typeof allTasks>();
  for (const task of allTasks) {
    if (!task.session_id) continue;
    const list = tasksBySessionId.get(task.session_id) ?? [];
    list.push(task);
    tasksBySessionId.set(task.session_id, list);
  }

  return joinedClasses.map((classRow) => {
    const classSessions = sessionsByClassId.get(classRow.class_id) ?? [];
    const classTaskInputs = classSessions.flatMap(
      (session) => tasksBySessionId.get(session.id) ?? []
    );
    const classTasks = buildClassTaskRows(
      classSessions,
      classTaskInputs.map((task) => ({
        id: task.id,
        session_id: task.session_id,
        title: task.title,
        max_grade: task.max_grade,
        due_date: task.due_date,
        created_at: task.created_at,
      }))
    );

    const classStudentTasks = classTasks.flatMap((task) => {
      const row = studentTasksByTaskId.get(task.id);
      return row ? [row] : [];
    });

    const classAttendeeStatus = new Map<string, string>();
    for (const session of classSessions) {
      const status = attendeeStatusBySessionId.get(session.id);
      if (status) {
        classAttendeeStatus.set(session.id, status);
      }
    }

    const stored = courseGradeByClassId.get(classRow.class_id) ?? null;
    const finalExam = finalExamByClassId.get(classRow.class_id) ?? null;
    const finalExamGradeRecord = finalExam
      ? finalExamGradeByExamId.get(finalExam.id) ?? null
      : null;

    const context: ClassGradeContext = {
      sessions: classSessions,
      classTasks,
      finalExam,
      finalExamMaxGrade: finalExam?.max_grade ?? null,
      finalExamGradesByUserId: finalExamGradeRecord
        ? new Map([[studentUserId, finalExamGradeRecord]])
        : new Map(),
      studentTasksByUserId: new Map([[studentUserId, classStudentTasks]]),
      storedGradesByUserId: stored
        ? new Map([[studentUserId, stored]])
        : new Map(),
      attendeeStatusMapsByUserId: new Map([
        [studentUserId, classAttendeeStatus],
      ]),
    };

    return {
      classRow,
      detail: buildStudentClassTabDetail(
        context,
        studentUserId,
        classAttendeeStatus
      ),
      finalExam: finalExam ? mapFinalExamForStudentBundle(finalExam) : null,
      studentFinalExamGrade: finalExamGradeRecord
        ? mapStudentFinalExamGradeForBundle(finalExamGradeRecord, "Student")
        : null,
    };
  });
}

function buildAttendeeStatusMapsByUserId(
  attendees: Array<{
    session_id: string;
    student_id: string;
    status: string;
  }>
): Map<string, Map<string, string>> {
  const byUserId = new Map<string, Map<string, string>>();

  for (const row of attendees) {
    const sessionMap =
      byUserId.get(row.student_id) ?? new Map<string, string>();
    sessionMap.set(row.session_id, row.status);
    byUserId.set(row.student_id, sessionMap);
  }

  return byUserId;
}

export async function listComputedStudentGradeSheetBundlesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  classRow: ManagerClassRow;
  bundles: ComputedStudentGradeSheetBundle[];
}> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.GRADES_EXPORT_CERTIFICATES
  );

  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const mappedFinalExam = context.finalExam
    ? mapFinalExamForStudentBundle(context.finalExam)
    : null;

  const bundles = students.flatMap((student) => {
    const stored = context.storedGradesByUserId.get(student.user_id);

    if (!stored) {
      return [];
    }

    const attendeeStatusBySessionId =
      context.attendeeStatusMapsByUserId.get(student.user_id) ??
      new Map<string, string>();

    return [
      {
        student,
        gradeRow: mapStoredGradeRow(student, stored),
        detail: buildStudentClassTabDetail(
          context,
          student.user_id,
          attendeeStatusBySessionId
        ),
        classTasks: context.classTasks,
        finalExam: mappedFinalExam,
      },
    ];
  });

  bundles.sort((left, right) =>
    left.student.full_name.localeCompare(right.student.full_name)
  );

  return {
    classRow: guard.classRow,
    bundles,
  };
}

export async function listClassStudentGradesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  rows: ManagerClassStudentGradeRow[];
  tasks: ManagerClassTaskForGradesRow[];
}> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const rows = students.map((student) => {
    const stored = context.storedGradesByUserId.get(student.user_id);
    if (stored) {
      return mapStoredGradeRow(student, stored);
    }

    return mapPendingGradeRow(student, context);
  });

  return {
    rows,
    tasks: context.classTasks,
  };
}

function buildFinalExamStudentGradesFromContext(
  context: ClassGradeContext,
  students: Awaited<ReturnType<typeof listClassStudentsForManager>>
): ManagerStudentFinalExamGradeRow[] {
  if (!context.finalExam) {
    return [];
  }

  const nameByUserId = new Map(
    students.map((student) => [student.user_id, student.full_name])
  );

  return Array.from(context.finalExamGradesByUserId.values()).map((record) =>
    mapStudentFinalExamGradeForBundle(
      record,
      nameByUserId.get(record.student_id) ?? "Unknown student"
    )
  );
}

export async function loadClassGradesPageData(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  classRow: ManagerClassRow;
  rows: ManagerClassStudentGradeRow[];
  tasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamStudentGrades: ManagerStudentFinalExamGradeRow[];
}> {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorUserId, classId),
    loadClassGradeContext(adminClient, classId),
  ]);

  const rows = students.map((student) => {
    const stored = context.storedGradesByUserId.get(student.user_id);
    if (stored) {
      return mapStoredGradeRow(student, stored);
    }

    return mapPendingGradeRow(student, context);
  });

  return {
    classRow: guard.classRow,
    rows,
    tasks: context.classTasks,
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
    finalExamStudentGrades: buildFinalExamStudentGradesFromContext(
      context,
      students
    ),
  };
}

export async function loadClassStudentGradeDetailPageData(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  studentProfileId: string
): Promise<{
  classRow: ManagerClassRow;
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
} | null> {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const profileResult = await studentProfileRepository.findStudentProfileById(
    adminClient,
    studentProfileId
  );

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (!profileResult.data) {
    return null;
  }

  const [student, context] = await Promise.all([
    fetchClassStudentRowForManager(
      adminClient,
      classId,
      profileResult.data.user_id
    ),
    loadClassGradeContext(adminClient, classId),
  ]);

  if (!student) {
    return null;
  }

  const attendeeStatusBySessionId =
    context.attendeeStatusMapsByUserId.get(student.user_id) ??
    new Map<string, string>();

  const stored = context.storedGradesByUserId.get(student.user_id);
  const gradeRow = stored
    ? mapStoredGradeRow(student, stored)
    : mapPendingGradeRow(student, context);

  return {
    classRow: guard.classRow,
    student,
    gradeRow,
    detail: buildStudentClassTabDetail(
      context,
      student.user_id,
      attendeeStatusBySessionId
    ),
    classTasks: context.classTasks,
    finalExam: context.finalExam
      ? mapFinalExamForStudentBundle(context.finalExam)
      : null,
  };
}

function evaluateStudentCourseGradeFromContext(
  student: ManagerClassStudentRow,
  classId: string,
  context: ClassGradeContext,
  options?: ComputeGradeOptions
):
  | { ok: true; payload: UpsertStudentCourseGradeInput }
  | { ok: false; error: string } {
  const factorWeights = resolveFactorWeights(options);
  const studentTasks = context.studentTasksByUserId.get(student.user_id) ?? [];
  const finalExamGradeRecord =
    context.finalExamGradesByUserId.get(student.user_id) ?? null;
  const missingItems = buildStudentGradeMissingItems({
    classTasks: context.classTasks,
    studentTasks,
    finalExam: context.finalExam
      ? {
          id: context.finalExam.id,
          title: context.finalExam.title,
          max_grade: context.finalExam.max_grade,
          due_date: context.finalExam.due_date,
        }
      : null,
    finalExamGrade: finalExamGradeRecord,
    factorWeights,
  });

  if (hasStudentGradeMissingItems(missingItems)) {
    return {
      ok: false,
      error: "This student is missing one or more required grade inputs.",
    };
  }

  const taskWeights =
    options?.taskWeights ??
    buildDefaultTaskWeightsForClass(context.classTasks);

  const taskTotalGrade = computeStudentTaskTotalGrade(
    context.classTasks,
    studentTasks,
    taskWeights
  );
  const finalExamGrade = normalizeFinalExamGradeForCompute(
    finalExamGradeRecord?.grade ?? null,
    finalExamGradeRecord?.status,
    context.finalExamMaxGrade
  );

  if (factorWeights.tasks_weight > 0 && taskTotalGrade == null) {
    return {
      ok: false,
      error: "This student is missing one or more task grades.",
    };
  }

  if (factorWeights.final_exam_weight > 0 && finalExamGrade == null) {
    return {
      ok: false,
      error: "This student is missing a final exam grade.",
    };
  }

  return {
    ok: true,
    payload: {
      user_id: student.user_id,
      class_id: classId,
      task_json_grade_weights: buildTaskWeightPayload(
        context.classTasks,
        taskWeights
      ),
      task_weight: factorWeights.tasks_weight,
      task_total_grade: taskTotalGrade ?? 0,
      final_exam_grade: finalExamGrade ?? 0,
      final_exam_weight: factorWeights.final_exam_weight,
      type: options?.computeType ?? "final",
      existing_id:
        context.storedGradesByUserId.get(student.user_id)?.id ?? null,
    },
  };
}

async function saveEvaluatedStudentCourseGrade(
  adminClient: Supabase,
  actor: AuditActor,
  student: ManagerClassStudentRow,
  payload: UpsertStudentCourseGradeInput
): Promise<
  | { success: true; row: ManagerClassStudentGradeRow }
  | { success: false; error: string }
> {
  const saveResult = await studentCourseGradeRepository.saveStudentCourseGrade(
    adminClient,
    payload
  );

  if (saveResult.error || !saveResult.data) {
    return {
      success: false,
      error: saveResult.error?.message ?? "Unable to save computed grade.",
    };
  }

  const row = mapStoredGradeRow(
    student,
    saveResult.data as StudentCourseGradeRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: payload.existing_id ? "update" : "insert",
    table_name: "student_course_grade",
    record_id: row.course_grade_id ?? saveResult.data.id,
    new_data: {
      class_id: payload.class_id,
      user_id: payload.user_id,
      task_weight: payload.task_weight,
      final_exam_weight: payload.final_exam_weight,
      type: payload.type,
    },
  });

  return { success: true, row };
}

async function saveEvaluatedStudentCourseGradesBatch(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string,
  items: Array<{
    student: ManagerClassStudentRow;
    payload: UpsertStudentCourseGradeInput;
  }>
): Promise<
  Array<
    | { success: true; row: ManagerClassStudentGradeRow }
    | { success: false; error: string }
  >
> {
  if (items.length === 0) {
    return [];
  }

  const saveResult = await studentCourseGradeRepository.upsertStudentCourseGrades(
    adminClient,
    items.map((item) => item.payload)
  );

  if (saveResult.error || !saveResult.data) {
    const message =
      saveResult.error?.message ?? "Unable to save computed grades.";
    return items.map(() => ({ success: false as const, error: message }));
  }

  const savedByUserId = new Map(
    (saveResult.data as StudentCourseGradeRecord[]).map((record) => [
      record.user_id,
      record,
    ])
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_course_grade",
    record_id: classId,
    new_data: {
      class_id: classId,
      user_ids: items.map((item) => item.student.user_id),
      count: items.length,
    },
    metadata: { note: "Batch computed student course grades." },
  });

  return items.map((item) => {
    const saved = savedByUserId.get(item.student.user_id);
    if (!saved) {
      return {
        success: false as const,
        error: "Unable to save computed grade.",
      };
    }

    return {
      success: true as const,
      row: mapStoredGradeRow(item.student, saved),
    };
  });
}

async function computeAndSaveStudentCourseGrade(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  userId: string,
  options?: ComputeGradeOptions
): Promise<
  | { success: true; row: ManagerClassStudentGradeRow; message: string }
  | { success: false; error: string }
> {
  let student: ManagerClassStudentRow | null;
  let context: ClassGradeContext;

  try {
    [student, context] = await Promise.all([
      fetchClassStudentRowForManager(adminClient, classId, userId),
      loadClassGradeContext(adminClient, classId),
    ]);
  } catch (loadError) {
    return {
      success: false,
      error:
        loadError instanceof Error
          ? loadError.message
          : "Unable to load class grade context.",
    };
  }

  if (!student) {
    return { success: false, error: "Student is not a member of this class." };
  }

  const evaluated = evaluateStudentCourseGradeFromContext(
    student,
    classId,
    context,
    options
  );

  if (!evaluated.ok) {
    return { success: false, error: evaluated.error };
  }

  const saved = await saveEvaluatedStudentCourseGrade(
    adminClient,
    actor,
    student,
    evaluated.payload
  );

  if (!saved.success) {
    return saved;
  }

  return {
    success: true,
    row: saved.row,
    message: options?.computeLabel
      ? `Computed ${student.full_name} using ${options.computeLabel}.`
      : `Computed ${student.full_name}.`,
  };
}

export async function computeStudentCourseGradeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  userId: string,
  options?: ComputeGradeOptions
) {
  const permission =
    options?.computeType === "custom"
      ? PERMISSIONS.GRADES_COMPUTE_CUSTOM
      : PERMISSIONS.GRADES_COMPUTE;
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    permission
  );
  if (unauthorized) {
    return { success: false as const, error: unauthorized };
  }
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  return computeAndSaveStudentCourseGrade(
    adminClient,
    actorUserId,
    actor,
    classId,
    userId,
    options
  );
}

export async function computeAllStudentCourseGradesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  studentUserIds: string[],
  options?: ComputeGradeOptions
) {
  const timer = createNavStepTimer("computeAllStudentCourseGrades");
  try {
    const permission =
      options?.computeType === "custom"
        ? PERMISSIONS.GRADES_COMPUTE_CUSTOM
        : PERMISSIONS.GRADES_COMPUTE_ALL;
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(adminClient, actorUserId, permission)
    );
    if (unauthorized) {
      return { success: false as const, error: unauthorized };
    }
    const guard = await timer.step("gradeLock", () =>
      assertClassGradesUnlockedForManager(adminClient, actorUserId, classId)
    );

    if (!guard.ok) {
      return { success: false as const, error: guard.error };
    }

    const enrollmentsResult = await timer.step("enrollments", () =>
      studentClassRepository.listStudentClassesByClassId(adminClient, classId)
    );

    if (enrollmentsResult.error) {
      return { success: false as const, error: enrollmentsResult.error.message };
    }

    const memberUserIds = new Set(
      (enrollmentsResult.data ?? []).map((row) => row.user_id)
    );

    const requestedMemberIds = studentUserIds.filter((userId) =>
      memberUserIds.has(userId)
    );
    const skippedNonMembers = studentUserIds.length - requestedMemberIds.length;

    if (requestedMemberIds.length === 0) {
      return {
        success: false as const,
        error: "No students could be computed.",
      };
    }

    let students: ManagerClassStudentRow[];
    let context: ClassGradeContext;
    try {
      const loaded = await timer.step("gradeContext", () =>
        Promise.all([
          listClassStudentsForManager(adminClient, actorUserId, classId),
          loadClassGradeContext(adminClient, classId),
        ])
      );
      students = loaded[0];
      context = loaded[1];
    } catch (loadError) {
      return {
        success: false as const,
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load class grade context.",
      };
    }

    const studentByUserId = new Map(
      students.map((student) => [student.user_id, student])
    );
    const evaluatedSaves: Array<{
      student: ManagerClassStudentRow;
      payload: UpsertStudentCourseGradeInput;
    }> = [];
    const failures: string[] = [];

    for (const userId of requestedMemberIds) {
      const student = studentByUserId.get(userId);
      if (!student) {
        failures.push("Student is not a member of this class.");
        continue;
      }

      const evaluated = evaluateStudentCourseGradeFromContext(
        student,
        classId,
        context,
        options
      );

      if (!evaluated.ok) {
        failures.push(evaluated.error);
        continue;
      }

      evaluatedSaves.push({ student, payload: evaluated.payload });
    }

    const computedRows: ManagerClassStudentGradeRow[] = [];

    await timer.step("saveGrades", async () => {
      for (
        let index = 0;
        index < evaluatedSaves.length;
        index += COMPUTE_ALL_SAVE_CHUNK
      ) {
        const chunk = evaluatedSaves.slice(
          index,
          index + COMPUTE_ALL_SAVE_CHUNK
        );
        const saved = await saveEvaluatedStudentCourseGradesBatch(
          adminClient,
          actor,
          classId,
          chunk
        );

        for (const result of saved) {
          if (!result.success) {
            failures.push(result.error);
            continue;
          }
          computedRows.push(result.row);
        }
      }
    });

    if (computedRows.length === 0) {
      return {
        success: false as const,
        error: failures[0] ?? "No students could be computed.",
      };
    }

    const skippedTotal = failures.length + skippedNonMembers;
    const skippedNote =
      skippedNonMembers > 0
        ? ` Skipped ${skippedNonMembers} non-member(s).`
        : "";

    return {
      success: true as const,
      rows: computedRows,
      message: `Computed ${computedRows.length} student${
        computedRows.length === 1 ? "" : "s"
      }.${skippedNote}`,
      skippedCount: skippedTotal,
    };
  } finally {
    timer.end();
  }
}

export async function deleteStudentCourseGradeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  userId: string
) {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.GRADES_DELETE);
  if (unauthorized) {
    return { success: false as const, error: unauthorized };
  }

  const [guard, existing] = await Promise.all([
    assertClassGradesUnlockedForManager(adminClient, actorUserId, classId),
    studentCourseGradeRepository.findStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    ),
  ]);

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  if (existing.error) {
    return { success: false as const, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false as const, error: "Computed grade not found." };
  }

  const deleteResult =
    await studentCourseGradeRepository.deleteStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    );

  if (deleteResult.error) {
    return { success: false as const, error: deleteResult.error.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    table_name: "student_course_grade",
    record_id: existing.data.id,
    old_data: {
      class_id: classId,
      user_id: userId,
    },
  });

  return { success: true as const, message: "Computed grade deleted." };
}

export function buildDefaultTaskWeightsForClass(
  tasks: ManagerClassTaskForGradesRow[]
) {
  if (tasks.length === 0) {
    return {};
  }

  const even = roundGrade(100 / tasks.length);
  const weights: Record<string, string> = {};

  tasks.forEach((task, index) => {
    if (index === tasks.length - 1) {
      const assigned = even * (tasks.length - 1);
      weights[task.id] = String(roundGrade(100 - assigned));
    } else {
      weights[task.id] = String(even);
    }
  });

  return weights;
}
