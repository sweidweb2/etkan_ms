import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getUnauthorizedError,
  hasPermission,
} from "@/services/auth/authorization.service";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { addStudentsToClassSchema } from "@/lib/validators/manager/add-student-to-class";
import { copyStudentsFromClassSchema } from "@/lib/validators/manager/copy-students-from-class";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  coalesceWarning,
  warnSoftFailure,
} from "@/lib/ops/soft-success";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import type { ClassDetailRecord } from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  onStudentsJoinedClass,
  type StudentJoinSyncItem,
} from "@/services/accounting/accounting-sync.service";
import {
  seedLateJoinAttendeesForStudents,
  seedLateJoinStudentTasksForStudents,
} from "@/services/classes/session-seed.service";
import { resolveActiveStudentDiff } from "@/services/classes/class-enrollment-diff.service";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import {
  PAYMENT_SYNC_FAILURE_WARNING,
  mapClassDetailRecordToRow,
  mapStudentFinalExamGradeRecord,
  recordPaymentSyncFailure,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";
import {
  assertAssignedTeacherForClassIds,
  assertAssignedTeacherForClassMutation,
} from "@/services/classes/teacher-class-scope.service";

export type AddStudentsToClassResult =
  | {
      success: true;
      students: ManagerClassStudentRow[];
      studentGrades: ManagerStudentFinalExamGradeRow[];
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
      autoAssignedPhase?: { id: string; name: string };
      optionalPaymentPhases?: Array<{ id: string; name: string }>;
    }
  | MutationFailure;

/**
 * Shared enroll pipeline used by Add student and Copy from class.
 * Caller must already authorize the actor.
 */
async function enrollStudentsInClassCore(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileIds: string[];
  },
  timer: ReturnType<typeof createNavStepTimer>
): Promise<AddStudentsToClassResult> {
    const uniqueIds = [...new Set(input.studentProfileIds)];

    const [
      classResult,
      studentProfilesResult,
      enrollmentResult,
      teacherResult,
      sessionResult,
    ] = await timer.step("lookups", () =>
      Promise.all([
        classRepository.findClassDetailById(adminClient, input.class_id),
        studentProfileRepository.listStudentProfilesByIds(adminClient, uniqueIds),
        studentClassRepository.countStudentClassesByClassId(
          adminClient,
          input.class_id
        ),
        classTeacherRepository.countClassTeachersByClassId(
          adminClient,
          input.class_id
        ),
        sessionRepository.listSessionCountsByClassIds(adminClient, [
          input.class_id,
        ]),
      ])
    );

    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }

    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    if (studentProfilesResult.error) {
      return { success: false, error: studentProfilesResult.error.message };
    }

    if (enrollmentResult.error) {
      return { success: false, error: enrollmentResult.error.message };
    }

    if (teacherResult.error) {
      return { success: false, error: teacherResult.error.message };
    }

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    const classRecord = classResult.data as ClassDetailRecord;
    const profileById = new Map(
      (studentProfilesResult.data ?? []).map((row) => [row.id, row])
    );

    const withdrawnProfileIds = new Set<string>();
    if (classRecord.semester_id) {
      const withdrawnResult =
        await studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester(
          adminClient,
          classRecord.semester_id,
          uniqueIds
        );
      if (withdrawnResult.error) {
        return { success: false, error: withdrawnResult.error.message };
      }
      for (const id of withdrawnResult.data ?? []) {
        withdrawnProfileIds.add(id);
      }
    }

    const eligibleUserIds: string[] = [];
    const seenUserIds = new Set<string>();
    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile || profile.status !== STUDENT_STATUSES.ACTIVE) {
        continue;
      }
      if (withdrawnProfileIds.has(studentProfileId)) {
        continue;
      }
      if (seenUserIds.has(profile.user_id)) {
        continue;
      }
      seenUserIds.add(profile.user_id);
      eligibleUserIds.push(profile.user_id);
    }

    const enrollResult = await timer.step("enroll", () =>
      studentClassRepository.enrollStudentsInClass(
        adminClient,
        input.class_id,
        eligibleUserIds
      )
    );

    if (enrollResult.error || !enrollResult.data) {
      return {
        success: false,
        error: enrollResult.error?.message ?? "Unable to enroll students.",
      };
    }

    const insertedByUserId = new Map(
      enrollResult.data.inserted.map((row) => [row.user_id, row])
    );
    const alreadyEnrolled = new Set(enrollResult.data.already_enrolled);
    const insertedUserIds = enrollResult.data.inserted.map((row) => row.user_id);

    const failures: string[] = [];
    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile) {
        failures.push("Student not found.");
        continue;
      }
      if (profile.status !== STUDENT_STATUSES.ACTIVE) {
        failures.push("Only active students can be added to a class.");
        continue;
      }
      if (withdrawnProfileIds.has(studentProfileId)) {
        failures.push("Student already dropped from this semester.");
        continue;
      }
      if (alreadyEnrolled.has(profile.user_id)) {
        failures.push("This student is already enrolled in this class.");
        continue;
      }
      if (!insertedByUserId.has(profile.user_id)) {
        failures.push("Unable to enroll student.");
      }
    }

    if (insertedUserIds.length === 0) {
      return {
        success: false,
        error: failures[0] ?? "Unable to enroll students.",
        fieldErrors: {
          studentProfileIds: [failures[0] ?? "Unable to enroll students."],
        },
      };
    }

    const [gradeResult, attendeesError, tasksError, emailsResult] =
      await timer.step("hydrate", () =>
        Promise.all([
          finalExamRepository.ensureEnrollmentFinalExamGrades(
            adminClient,
            input.class_id,
            insertedUserIds
          ),
          seedLateJoinAttendeesForStudents(
            adminClient,
            input.class_id,
            insertedUserIds
          ).then(
            () => null,
            (err: unknown) => err
          ),
          seedLateJoinStudentTasksForStudents(
            adminClient,
            input.class_id,
            insertedUserIds
          ).then(
            () => null,
            (err: unknown) => err
          ),
          authRepository.listAuthEmailsByIds(adminClient, insertedUserIds),
        ])
      );

    let warning: string | undefined;
    const batchMeta = {
      classId: input.class_id,
      studentCount: insertedUserIds.length,
    };

    if (gradeResult.error) {
      warning = warnSoftFailure(
        "classEnrollment.batchSeedFinalExamGrade",
        gradeResult.error.message,
        "Student enrolled, but final exam grade row could not be created.",
        batchMeta
      );
    }

    if (attendeesError) {
      warning = coalesceWarning(
        warning,
        warnSoftFailure(
          "classEnrollment.batchSeedAttendees",
          attendeesError,
          "Student enrolled, but attendance or task grade rows could not be created.",
          batchMeta
        )
      );
    }

    if (tasksError) {
      warning = coalesceWarning(
        warning,
        warnSoftFailure(
          "classEnrollment.batchSeedTasks",
          tasksError,
          "Student enrolled, but attendance or task grade rows could not be created.",
          batchMeta
        )
      );
    }

    if (emailsResult.error) {
      return {
        success: false,
        error: emailsResult.error.message,
      };
    }

    const emailByUserId = emailsResult.data;
    const gradeByStudentId = new Map(
      (gradeResult.data ?? []).map((row) => [row.student_id, row])
    );

    const students: ManagerClassStudentRow[] = [];
    const studentGrades: ManagerStudentFinalExamGradeRow[] = [];

    for (const studentProfileId of uniqueIds) {
      const profile = profileById.get(studentProfileId);
      if (!profile) {
        continue;
      }
      const enrollment = insertedByUserId.get(profile.user_id);
      if (!enrollment) {
        continue;
      }

      const student: ManagerClassStudentRow = {
        id: enrollment.id,
        student_profile_id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: emailByUserId.get(profile.user_id) ?? "",
        phone: profile.phone,
        joined_at: enrollment.joined_at ?? new Date().toISOString(),
      };
      students.push(student);

      const gradeRecord = gradeByStudentId.get(profile.user_id);
      if (gradeRecord) {
        studentGrades.push(
          mapStudentFinalExamGradeRecord(gradeRecord, student.full_name)
        );
      }
    }

    const classRow = mapClassDetailRecordToRow(classRecord, {
      enrollment_count: (enrollmentResult.count ?? 0) + insertedUserIds.length,
      teacher_count: teacherResult.count ?? 0,
      completed_sessions: sessionResult.data?.length ?? 0,
    });

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "student_class",
        record_id: input.class_id,
        metadata: {
          note: "Students enrolled in class (batch).",
          class_id: input.class_id,
          count: students.length,
          enrollments: students.map((student) => ({
            student_class_id: student.id,
            user_id: student.user_id,
            student_profile_id: student.student_profile_id,
          })),
        },
      })
    );

    let joinItems: StudentJoinSyncItem[] = [];

    // Rejoin after semester withdraw is deferred — withdrawn students are filtered above.

    try {
      joinItems = await timer.step("paymentSync", () =>
        onStudentsJoinedClass(
          adminClient,
          { classId: input.class_id, studentIds: insertedUserIds },
          actor
        )
      );
      const failedJoins = joinItems.filter((item) => !item.ok);
      if (failedJoins.length > 0) {
        await Promise.all(
          failedJoins.map((item) =>
            recordPaymentSyncFailure(adminClient, actor, {
              studentId: item.studentId,
              classId: input.class_id,
              operation: "enroll_join_sync",
              error: new Error(item.error ?? "Payment sync failed."),
            })
          )
        );
        warning = coalesceWarning(warning, PAYMENT_SYNC_FAILURE_WARNING);
      }
    } catch (syncError) {
      await Promise.all(
        insertedUserIds.map((studentId) =>
          recordPaymentSyncFailure(adminClient, actor, {
            studentId,
            classId: input.class_id,
            operation: "enroll_join_sync",
            error: syncError,
          })
        )
      );
      warning = coalesceWarning(warning, PAYMENT_SYNC_FAILURE_WARNING);
    }

    let autoAssignedPhase: { id: string; name: string } | undefined;
    let optionalPaymentPhases: Array<{ id: string; name: string }> | undefined;

    if (
      !warning &&
      students.length === 1 &&
      joinItems.length > 0
    ) {
      const student = students[0];
      const joinItem = joinItems.find(
        (item) => item.ok && item.studentId === student.user_id && item.phase
      );
      const phase = joinItem?.phase;
      if (phase && actorUserId) {
        const canAssignOptional = await hasPermission(
          adminClient,
          actorUserId,
          PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
        );
        if (canAssignOptional) {
          const { data: openedPhases, error: openedError } =
            await paymentPhaseRepository.listOpenedPaymentPhasesBySemesterId(
              adminClient,
              phase.semester_id
            );
          if (!openedError) {
            const others = (openedPhases ?? [])
              .filter((row) => row.id !== phase.id)
              .map((row) => ({ id: row.id, name: row.name }));
            if (others.length > 0) {
              autoAssignedPhase = { id: phase.id, name: phase.name };
              optionalPaymentPhases = others;
            }
          }
        }
      }
    }

    const message =
      failures.length === 0
        ? students.length === 1
          ? `${students[0].full_name} added to class.`
          : `${students.length} students added to class.`
        : `Added ${students.length} of ${uniqueIds.length} students. ${failures.length} could not be added.`;

    return {
      success: true,
      students,
      studentGrades,
      classRow,
      message,
      warning,
      autoAssignedPhase,
      optionalPaymentPhases,
    };
}

export async function addStudentsToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileIds: string[];
  }
): Promise<AddStudentsToClassResult> {
  const timer = createNavStepTimer("addStudentsToClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_ADD_STUDENT
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const scope = await assertAssignedTeacherForClassMutation(
      adminClient,
      actor,
      input.class_id
    );
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const parsed = addStudentsToClassSchema.safeParse({
      studentProfileIds: input.studentProfileIds,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    return await enrollStudentsInClassCore(
      adminClient,
      actorUserId,
      actor,
      {
        class_id: input.class_id,
        studentProfileIds: parsed.data.studentProfileIds,
      },
      timer
    );
  } finally {
    timer.end();
  }
}

export async function copyStudentsFromClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    source_class_id: string;
    studentProfileIds: string[];
  }
): Promise<AddStudentsToClassResult> {
  const timer = createNavStepTimer("copyStudentsFromClass");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.CLASSES_COPY_STUDENTS_FROM_CLASS
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const scope = await assertAssignedTeacherForClassIds(adminClient, actor, [
      input.class_id,
      input.source_class_id,
    ]);
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const parsed = copyStudentsFromClassSchema.safeParse({
      source_class_id: input.source_class_id,
      studentProfileIds: input.studentProfileIds,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const diffResult = await timer.step("diff", () =>
      resolveActiveStudentDiff(
        adminClient,
        input.class_id,
        parsed.data.source_class_id
      )
    );

    if (!diffResult.success) {
      return { success: false, error: diffResult.error };
    }

    const eligibleIds = new Set(
      diffResult.students
        .filter((student) => !student.semester_dropped)
        .map((student) => student.student_profile_id)
    );
    const selectedIds = [
      ...new Set(
        parsed.data.studentProfileIds.filter((id) => eligibleIds.has(id))
      ),
    ];

    if (selectedIds.length === 0) {
      return {
        success: false,
        error: "Please select at least one student to copy.",
        fieldErrors: {
          studentProfileIds: ["Please select at least one student to copy."],
        },
      };
    }

    return await enrollStudentsInClassCore(
      adminClient,
      actorUserId,
      actor,
      {
        class_id: input.class_id,
        studentProfileIds: selectedIds,
      },
      timer
    );
  } finally {
    timer.end();
  }
}
