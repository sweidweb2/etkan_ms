import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { addStudentToClassSchema } from "@/lib/validators/manager/add-student-to-class";
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
import type { StudentFinalExamGradeRecord } from "@/repositories/final-exam.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { onStudentJoinedClass } from "@/services/accounting/accounting-sync.service";
import {
  seedLateJoinAttendeesForStudent,
  seedLateJoinStudentTasksForStudent,
} from "@/services/classes/session-seed.service";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import {
  mapClassDetailRecordToRow,
  mapStudentFinalExamGradeRecord,
  withPaymentSync,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";

export type AddStudentToClassResult =
  | {
      success: true;
      student: ManagerClassStudentRow;
      studentGrade?: ManagerStudentFinalExamGradeRow;
      classRow: ManagerClassRow;
      message: string;
      warning?: string;
    }
  | MutationFailure;

export async function addStudentToClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    studentProfileId: string;
  },
  options?: {
    /** Only transfer uses this — normal enroll always syncs payment. */
    skipPaymentSync?: boolean;
  }
): Promise<AddStudentToClassResult> {
  const timer = createNavStepTimer("addStudentToClass");
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

    const parsed = addStudentToClassSchema.safeParse({
      studentProfileId: input.studentProfileId,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const [
      classResult,
      studentProfileResult,
      enrollmentResult,
      teacherResult,
      sessionResult,
    ] = await timer.step("lookups", () =>
      Promise.all([
        classRepository.findClassDetailById(adminClient, input.class_id),
        studentProfileRepository.findStudentProfileById(
          adminClient,
          parsed.data.studentProfileId
        ),
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

    const classRecord = classResult.data as ClassDetailRecord;

    if (studentProfileResult.error) {
      return { success: false, error: studentProfileResult.error.message };
    }

    if (!studentProfileResult.data) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { studentProfileId: ["Student not found."] },
      };
    }

    if (studentProfileResult.data.status !== STUDENT_STATUSES.ACTIVE) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: [
            "Only active students can be added to a class.",
          ],
        },
      };
    }

    if (classRecord.semester_id) {
      const semesterEnrollment =
        await studentSemesterRepository.findEnrollmentByStudentAndSemester(
          adminClient,
          studentProfileResult.data.id,
          classRecord.semester_id
        );
      if (semesterEnrollment.error) {
        return { success: false, error: semesterEnrollment.error.message };
      }
      if (
        semesterEnrollment.data?.status === STUDENT_SEMESTER_STATUSES.WITHDRAWN
      ) {
        return {
          success: false,
          error: "Please fix the errors below.",
          fieldErrors: {
            studentProfileId: [
              "Student already dropped from this semester.",
            ],
          },
        };
      }
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

    const studentProfile = studentProfileResult.data;
    const userId = studentProfile.user_id;

    const enrollResult = await timer.step("enroll", () =>
      studentClassRepository.enrollStudentInClass(
        adminClient,
        userId,
        input.class_id
      )
    );

    if (enrollResult.error) {
      return { success: false, error: enrollResult.error.message };
    }

    if (!enrollResult.data) {
      return { success: false, error: "Unable to enroll student." };
    }

    if (!enrollResult.data.ok) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: {
          studentProfileId: ["This student is already enrolled in this class."],
        },
      };
    }

    const data = enrollResult.data.enrollment;

    const authResult = await timer.step("hydrateAuth", () =>
      authRepository.getAuthUserById(adminClient, userId)
    );

    const student: ManagerClassStudentRow = {
      id: data.id,
      student_profile_id: studentProfile.id,
      user_id: userId,
      full_name: studentProfile.full_name,
      email: authResult.data.user?.email ?? "",
      phone: studentProfile.phone,
      joined_at: data.joined_at ?? new Date().toISOString(),
    };

    let studentGrade: ManagerStudentFinalExamGradeRow | undefined;

    const [gradeResult, attendeesError, tasksError] = await Promise.all([
      timer.step("examGrade", () =>
        finalExamRepository.ensureEnrollmentFinalExamGrade(
          adminClient,
          input.class_id,
          userId
        )
      ),
      timer
        .step("attendees", () =>
          seedLateJoinAttendeesForStudent(adminClient, input.class_id, userId)
        )
        .then(
          () => null,
          (err: unknown) => err
        ),
      timer
        .step("tasks", () =>
          seedLateJoinStudentTasksForStudent(
            adminClient,
            input.class_id,
            userId
          )
        )
        .then(
          () => null,
          (err: unknown) => err
        ),
    ]);

    let warning: string | undefined;

    if (gradeResult.error) {
      warning = warnSoftFailure(
        "classEnrollment.seedFinalExamGrade",
        gradeResult.error.message,
        "Student enrolled, but final exam grade row could not be created.",
        { classId: input.class_id, userId }
      );
    }

    if (attendeesError) {
      warning = coalesceWarning(
        warning,
        warnSoftFailure(
          "classEnrollment.seedAttendees",
          attendeesError,
          "Student enrolled, but attendance rows could not be created.",
          { classId: input.class_id, userId }
        )
      );
    }

    if (tasksError) {
      warning = coalesceWarning(
        warning,
        warnSoftFailure(
          "classEnrollment.seedTasks",
          tasksError,
          "Student enrolled, but task grade rows could not be created.",
          { classId: input.class_id, userId }
        )
      );
    }

    if (gradeResult.data) {
      studentGrade = mapStudentFinalExamGradeRecord(
        gradeResult.data as StudentFinalExamGradeRecord,
        student.full_name
      );
    }

    const classRow = mapClassDetailRecordToRow(classRecord, {
      enrollment_count: (enrollmentResult.count ?? 0) + 1,
      teacher_count: teacherResult.count ?? 0,
      completed_sessions: sessionResult.data?.length ?? 0,
    });

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "student_class",
        record_id: student.id,
        new_data: {
          class_id: input.class_id,
          user_id: userId,
        },
      })
    );

    // Rejoin after semester withdraw is deferred — enroll is blocked above.

    if (!options?.skipPaymentSync) {
      const sync = await withPaymentSync(
        adminClient,
        actor,
        {
          studentId: userId,
          classId: input.class_id,
          operation: "enroll_join_sync",
        },
        () =>
          onStudentJoinedClass(
            adminClient,
            { studentId: userId, classId: input.class_id },
            actor
          ),
        { timer }
      );
      warning = coalesceWarning(warning, sync.warning);
    }

    return {
      success: true,
      student,
      studentGrade,
      classRow,
      message: `${student.full_name} added to class.`,
      warning,
    };
  } finally {
    timer.end();
  }
}
