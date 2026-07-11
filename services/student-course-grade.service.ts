import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import { roundGrade } from "@/lib/compute/custom-compute-form-utils";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import {
  computeStudentTaskTotalGrade,
  computeWeightedCourseTotalGrade,
  normalizeStoredFinalExamGrade,
} from "@/lib/manager/compute-student-course-grade";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as sessionRepository from "@/repositories/session.repository";
import type { SessionRecord } from "@/repositories/session.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import type { StudentCourseGradeRecord } from "@/repositories/student-course-grade.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { assertClassGradesUnlockedForManager, listClassStudentsForManager } from "@/services/class.service";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerStudentTaskGradeWeightRow } from "@/types/manager-student-course-grade";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type ClassGradeContext = {
  classTasks: ManagerClassTaskForGradesRow[];
  finalExamMaxGrade: number | null;
  finalExamGradesByUserId: Map<string, number | null>;
  studentTasksByUserId: Map<
    string,
    Array<{ task_id: string; grade: number | null; status: string }>
  >;
  storedGradesByUserId: Map<string, StudentCourseGradeRecord>;
};

type ComputeGradeOptions = {
  factorWeights?: FactorWeightsValues;
  taskWeights?: Record<string, string>;
  computeType?: string;
  computeLabel?: string;
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
    created_at?: string | null;
  }>
): ManagerClassTaskForGradesRow[] {
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const rows: ManagerClassTaskForGradesRow[] = [];

  for (const task of tasks) {
    if (!task.session_id) {
      continue;
    }

    const session = sessionById.get(task.session_id);
    if (!session) {
      continue;
    }

    rows.push({
      id: task.id,
      session_id: task.session_id,
      session_label: `S${session.nb_order}`,
      session_nb_order: session.nb_order,
      title: task.title ?? "Task",
      max_grade: task.max_grade,
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

  const [tasksResult, finalExamResult, storedGradesResult] = await Promise.all([
    taskRepository.listTasksForGradesBySessionIds(adminClient, sessionIds),
    finalExamRepository.findFinalExamByClassId(adminClient, classId),
    studentCourseGradeRepository.listStudentCourseGradesByClassId(
      adminClient,
      classId
    ),
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

  const classTasks = buildClassTaskRows(
    sessions,
    (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      session_id: task.session_id,
      title: task.title,
      max_grade: task.max_grade,
      created_at: task.created_at,
    }))
  );

  const taskIds = classTasks.map((task) => task.id);
  const studentTasksResult = await studentTaskRepository.listStudentTasksByTaskIds(
    adminClient,
    taskIds
  );

  if (studentTasksResult.error) {
    throw new Error(studentTasksResult.error.message);
  }

  let finalExamGradesByUserId = new Map<string, number | null>();

  if (finalExamResult.data) {
    const gradesResult =
      await finalExamRepository.listStudentFinalExamGradesByFinalExamId(
        adminClient,
        finalExamResult.data.id
      );

    if (gradesResult.error) {
      throw new Error(gradesResult.error.message);
    }

    finalExamGradesByUserId = new Map(
      (gradesResult.data ?? []).map((row) => [row.student_id, row.grade])
    );
  }

  const studentTasksByUserId = new Map<
    string,
    Array<{ task_id: string; grade: number | null; status: string }>
  >();

  for (const row of studentTasksResult.data ?? []) {
    const list = studentTasksByUserId.get(row.student_id) ?? [];
    list.push({
      task_id: row.task_id,
      grade: row.grade,
      status: row.status,
    });
    studentTasksByUserId.set(row.student_id, list);
  }

  const storedGradesByUserId = new Map(
    ((storedGradesResult.data ?? []) as StudentCourseGradeRecord[]).map(
      (row) => [row.user_id, row]
    )
  );

  return {
    classTasks,
    finalExamMaxGrade: finalExamResult.data?.max_grade ?? null,
    finalExamGradesByUserId,
    studentTasksByUserId,
    storedGradesByUserId,
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
    enrollment_status: student.enrollment_status,
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
  };
}

function mapPendingGradeRow(
  student: Awaited<ReturnType<typeof listClassStudentsForManager>>[number],
  context: ClassGradeContext
): ManagerClassStudentGradeRow {
  const studentTasks = context.studentTasksByUserId.get(student.user_id) ?? [];
  const taskTotalGrade = computeStudentTaskTotalGrade(
    context.classTasks,
    studentTasks
  );
  const rawFinalExamGrade =
    context.finalExamGradesByUserId.get(student.user_id) ?? null;
  const finalExamGrade = normalizeStoredFinalExamGrade(
    rawFinalExamGrade,
    context.finalExamMaxGrade
  );

  return {
    student_profile_id: student.student_profile_id,
    user_id: student.user_id,
    full_name: student.full_name,
    username: student.username,
    email: student.email,
    phone: student.phone,
    enrollment_status: student.enrollment_status,
    is_computed: false,
    total_grade: null,
    task_total_grade: taskTotalGrade,
    final_exam_grade: finalExamGrade,
  };
}

export async function listClassStudentGradesForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  classId: string
): Promise<{
  rows: ManagerClassStudentGradeRow[];
  tasks: ManagerClassTaskForGradesRow[];
}> {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }

  const [students, context] = await Promise.all([
    listClassStudentsForManager(adminClient, actorRole, classId),
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

async function computeAndSaveStudentCourseGrade(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string,
  userId: string,
  options?: ComputeGradeOptions
): Promise<
  | { success: true; row: ManagerClassStudentGradeRow; message: string }
  | { success: false; error: string }
> {
  const students = await listClassStudentsForManager(
    adminClient,
    ROLES.MANAGER,
    classId
  );
  const student = students.find((row) => row.user_id === userId);

  if (!student) {
    return { success: false, error: "Student is not enrolled in this class." };
  }

  const context = await loadClassGradeContext(adminClient, classId);
  const factorWeights = resolveFactorWeights(options);
  const studentTasks = context.studentTasksByUserId.get(userId) ?? [];
  const taskTotalGrade = computeStudentTaskTotalGrade(
    context.classTasks,
    studentTasks
  );
  const rawFinalExamGrade =
    context.finalExamGradesByUserId.get(userId) ?? null;
  const finalExamGrade = normalizeStoredFinalExamGrade(
    rawFinalExamGrade,
    context.finalExamMaxGrade
  );

  if (factorWeights.tasks_weight > 0 && taskTotalGrade == null) {
    return {
      success: false,
      error: "This student is missing one or more task grades.",
    };
  }

  if (factorWeights.final_exam_weight > 0 && finalExamGrade == null) {
    return {
      success: false,
      error: "This student is missing a final exam grade.",
    };
  }

  const existing =
    await studentCourseGradeRepository.findStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  const taskWeights =
    options?.taskWeights ??
    buildDefaultTaskWeightsForClass(context.classTasks);

  const saveResult = await studentCourseGradeRepository.saveStudentCourseGrade(
    adminClient,
    {
      user_id: userId,
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
    }
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
    action: existing.data ? "update" : "insert",
    table_name: "student_course_grade",
    record_id: row.course_grade_id ?? saveResult.data.id,
    new_data: {
      class_id: classId,
      user_id: userId,
      task_weight: factorWeights.tasks_weight,
      final_exam_weight: factorWeights.final_exam_weight,
      type: options?.computeType ?? "final",
    },
  });

  return {
    success: true,
    row,
    message: options?.computeLabel
      ? `Computed ${student.full_name} using ${options.computeLabel}.`
      : `Computed ${student.full_name}.`,
  };
}

export async function computeStudentCourseGradeForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  classId: string,
  userId: string,
  options?: ComputeGradeOptions
) {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorRole,
    classId
  );

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  return computeAndSaveStudentCourseGrade(
    adminClient,
    actor,
    classId,
    userId,
    options
  );
}

export async function computeAllStudentCourseGradesForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  classId: string,
  studentUserIds: string[],
  options?: ComputeGradeOptions
) {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorRole,
    classId
  );

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  const computedRows: ManagerClassStudentGradeRow[] = [];
  const failures: string[] = [];

  for (const userId of studentUserIds) {
    const result = await computeAndSaveStudentCourseGrade(
      adminClient,
      actor,
      classId,
      userId,
      options
    );

    if (!result.success) {
      failures.push(result.error);
      continue;
    }

    computedRows.push(result.row);
  }

  if (computedRows.length === 0) {
    return {
      success: false as const,
      error: failures[0] ?? "No students could be computed.",
    };
  }

  return {
    success: true as const,
    rows: computedRows,
    message: `Computed ${computedRows.length} student${
      computedRows.length === 1 ? "" : "s"
    }.`,
    skippedCount: failures.length,
  };
}

export async function deleteStudentCourseGradeForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  classId: string,
  userId: string
) {
  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorRole,
    classId
  );

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  const existing =
    await studentCourseGradeRepository.findStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    );

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
