import { isAttendeePresentForRate } from "@/lib/constants/manager-attendee-status";
import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import { roundGrade } from "@/lib/compute/custom-compute-form-utils";
import { buildStudentGroupGradeSlots } from "@/lib/manager/class-group-grade-analytics";
import {
  computeStudentTaskTotalGrade,
  computeWeightedCourseTotalGrade,
  normalizeFinalExamGradeForCompute,
} from "@/lib/manager/compute-student-course-grade";
import {
  buildStudentGradeMissingItems,
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
import type { StudentCourseGradeRecord } from "@/repositories/student-course-grade.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import { listClassStudentsForManager } from "@/services/classes/class.service";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
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

export type Supabase = SupabaseClient<Database>;

export type ClassGradeContext = {
  sessions: SessionRecord[];
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: FinalExamRecord | null;
  finalExamMaxGrade: number | null;
  finalExamGradesByUserId: Map<string, StudentFinalExamGradeRecord>;
  studentTasksByUserId: Map<string, StudentTaskRecord[]>;
  storedGradesByUserId: Map<string, StudentCourseGradeRecord>;
  attendeeStatusMapsByUserId: Map<string, Map<string, string>>;
};

export type ComputeGradeOptions = {
  factorWeights?: FactorWeightsValues;
  taskWeights?: Record<string, string>;
  computeType?: string;
  computeLabel?: string;
};

export const COMPUTE_ALL_SAVE_CHUNK = 8;


export function parseTaskJsonGradeWeights(
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

export function taskWeightsFromJson(
  entries: ManagerStudentTaskGradeWeightRow[]
): Record<string, number> {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.weight]));
}

export function buildTaskWeightPayload(
  classTasks: ManagerClassTaskForGradesRow[],
  taskWeights: Record<string, string>
): Json {
  return classTasks.map((task) => ({
    key: task.id,
    label: `${task.session_label} · ${task.title}`,
    weight: Number(taskWeights[task.id] ?? 0),
  })) as Json;
}

export function resolveFactorWeights(options?: ComputeGradeOptions): FactorWeightsValues {
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

export function buildClassTaskRows(
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

export async function loadClassGradeContext(
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

export function mapStoredGradeRow(
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

export function mapPendingGradeRow(
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

export function parseGroupGradesJson(value: Json | null): ManagerStudentGroupGradeEntry[] {
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

export function parseAttendeeGradesJson(
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

export function mapStoredCourseGrade(
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

export function buildStudentAttendanceDetail(
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

export function buildStudentTaskDetail(
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

export function buildStudentClassTabDetail(
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

export function mapFinalExamForStudentBundle(
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

export function mapStudentFinalExamGradeForBundle(
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

export async function listStudentClassAcademicBundlesUnchecked(
  adminClient: Supabase,
  studentUserId: string,
  joinedClasses: ManagerStudentClassRow[]
): Promise<ManagerStudentClassAcademicBundle[]> {
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

export function buildAttendeeStatusMapsByUserId(
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

export function buildFinalExamStudentGradesFromContext(
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
